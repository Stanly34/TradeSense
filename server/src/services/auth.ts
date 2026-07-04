import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokens.js'
import crypto from 'crypto'

function excludePassword(user: Record<string, unknown>) {
  const { password, ...rest } = user
  return rest
}

export async function checkAvailability(field: 'username' | 'email', value: string) {
  const user = await prisma.user.findFirst({ where: { [field]: value } })
  return { available: !user }
}

export async function register(data: {
  fullName: string
  username: string
  email: string
  password: string
}) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email }, { username: data.username }],
    },
  })
  if (existing) {
    if (existing.email === data.email) throw new Error('Email already registered')
    throw new Error('Username already taken')
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      username: data.username,
      email: data.email,
      password: hashedPassword,
      isVerified: true,
    },
  })

  const tokenPayload = { userId: user.id, role: user.role }
  const accessToken = generateAccessToken(tokenPayload)
  const refreshToken = generateRefreshToken(tokenPayload)

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  const verificationToken = crypto.randomBytes(32).toString('hex')
  await prisma.setting.create({
    data: {
      key: `verify:${user.id}`,
      value: verificationToken,
      category: 'verification',
    },
  })

  return {
    user: excludePassword(user as unknown as Record<string, unknown>),
    accessToken,
    refreshToken,
    verificationToken,
  }
}

export async function login(emailOrUsername: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
    include: {
      subscription: { include: { plan: true } },
    },
  })
  if (!user) throw new Error('Invalid email or password')
  if (!user.isActive) throw new Error('Account is suspended')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Invalid email or password')

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  const tokenPayload = { userId: user.id, role: user.role }
  const accessToken = generateAccessToken(tokenPayload)
  const refreshToken = generateRefreshToken(tokenPayload)

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return {
    user: excludePassword(user as unknown as Record<string, unknown>),
    accessToken,
    refreshToken,
  }
}

export async function refresh(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } })
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token')
  }

  let payload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    throw new Error('Invalid refresh token')
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } })

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.isActive) throw new Error('Account not found or suspended')

  const tokenPayload = { userId: user.id, role: user.role }
  const accessToken = generateAccessToken(tokenPayload)
  const newRefreshToken = generateRefreshToken(tokenPayload)

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } })
}

export async function logoutAll(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}

export async function verifyEmail(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  })
  await prisma.setting.deleteMany({
    where: { key: { startsWith: `verify:${userId}` } },
  })
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('Email is not registered')

  const token = crypto.randomBytes(32).toString('hex')
  await prisma.setting.upsert({
    where: { key: `reset:${user.id}` },
    update: { value: token, createdAt: new Date() },
    create: {
      key: `reset:${user.id}`,
      value: token,
      category: 'password-reset',
    },
  })
  return token
}

export async function resetPassword(token: string, newPassword: string) {
  const setting = await prisma.setting.findFirst({
    where: { key: { startsWith: 'reset:' }, value: token },
  })
  if (!setting) throw new Error('Invalid or expired reset token')

  const elapsed = Date.now() - setting.createdAt.getTime()
  if (elapsed > 5 * 60 * 1000) {
    await prisma.setting.delete({ where: { id: setting.id } })
    throw new Error('Reset token has expired. Please request a new one.')
  }

  const userId = setting.key.replace('reset:', '')
  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })
  await prisma.setting.delete({ where: { id: setting.id } })
  await prisma.refreshToken.deleteMany({ where: { userId } })
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  })
  if (!user) throw new Error('User not found')
  return excludePassword(user as unknown as Record<string, unknown>)
}

export async function updateProfile(userId: string, data: { fullName?: string; username?: string }) {
  const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, role: true } })
  if (!currentUser) throw new Error('User not found')

  if (data.username !== undefined && currentUser.role !== 'ADMIN') {
    data.username = currentUser.username
  }

  if (data.username && data.username !== currentUser.username) {
    const existing = await prisma.user.findFirst({
      where: { username: data.username, id: { not: userId } },
    })
    if (existing) throw new Error('Username already taken')
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  })
  return excludePassword(user as unknown as Record<string, unknown>)
}

export async function uploadAvatar(userId: string, imageUrl: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { profileImage: imageUrl },
  })
  return excludePassword(user as unknown as Record<string, unknown>)
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new Error('Current password is incorrect')

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })
}
