import { Request, Response } from 'express'
import * as authService from '../services/auth.js'
import * as uploadService from '../services/upload.js'
import { prisma } from '../lib/prisma.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { sendPasswordResetEmail, sendOtpEmail } from '../services/email.js'

export async function checkAvailability(req: Request, res: Response) {
  try {
    const { username, email } = req.query
    if (username) {
      const result = await authService.checkAvailability('username', username as string)
      return sendSuccess(res, result)
    }
    if (email) {
      const result = await authService.checkAvailability('email', email as string)
      return sendSuccess(res, result)
    }
    return sendError(res, 'Provide username or email query parameter', 400)
  } catch (err) {
    return sendError(res, 'Availability check failed', 500)
  }
}

export async function sendOtp(req: Request, res: Response) {
  try {
    const otp = await authService.initiateRegistration(req.body)
    sendOtpEmail(req.body.email, otp).catch(e => console.error('[OTP EMAIL ERROR]', e))
    return sendSuccess(res, null, 'Verification code sent to your email')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send verification code'
    return sendError(res, message, 409)
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return sendError(res, 'Email and OTP are required', 400)
    const result = await authService.verifyOtpAndRegister(email, otp)
    return sendSuccess(res, result, 'Registration successful', 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed'
    return sendError(res, message, 400)
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    return sendSuccess(res, result, 'Login successful')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed'
    return sendError(res, message, 401)
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return sendError(res, 'Refresh token required', 400)
    const result = await authService.refresh(refreshToken)
    return sendSuccess(res, result, 'Token refreshed')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed'
    return sendError(res, message, 401)
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body
    if (refreshToken) await authService.logout(refreshToken)
    return sendSuccess(res, null, 'Logged out successfully')
  } catch {
    return sendError(res, 'Logout failed', 500)
  }
}

export async function logoutAll(req: Request, res: Response) {
  try {
    await authService.logoutAll(req.user!.userId)
    return sendSuccess(res, null, 'Logged out from all devices')
  } catch {
    return sendError(res, 'Logout failed', 500)
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const user = await authService.getCurrentUser(req.user!.userId)
    return sendSuccess(res, user)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get user'
    return sendError(res, message, 404)
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.body
    if (!token) return sendError(res, 'Verification token required', 400)

    const setting = await prisma.setting.findFirst({
      where: { key: { startsWith: 'verify:' }, value: token },
    })
    if (!setting) return sendError(res, 'Invalid or expired token', 400)

    const userId = setting.key.replace('verify:', '')
    await authService.verifyEmail(userId)
    return sendSuccess(res, null, 'Email verified successfully')
  } catch {
    return sendError(res, 'Verification failed', 500)
  }
}

export async function resendOtp(req: Request, res: Response) {
  try {
    const { email } = req.body
    if (!email) return sendError(res, 'Email is required', 400)
    const otp = await authService.resendOtp(email)
    sendOtpEmail(email, otp).catch(e => console.error('[OTP EMAIL ERROR]', e))
    return sendSuccess(res, null, 'Verification code resent')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to resend code'
    return sendError(res, message, 400)
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body
    const token = await authService.forgotPassword(email)
    if (token) {
      sendPasswordResetEmail(email, token).catch(e => console.error('[EMAIL ERROR]', e))
      return sendSuccess(res, null, 'If the email exists, a reset link has been sent')
    }
    return sendSuccess(res, null, 'If the email exists, a reset link has been sent')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process request'
    return sendError(res, message, 400)
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body
    await authService.resetPassword(token, password)
    return sendSuccess(res, null, 'Password reset successfully')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Password reset failed'
    return sendError(res, message, 400)
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const { fullName, username } = req.body
    const user = await authService.updateProfile(req.user!.userId, { fullName, username })
    return sendSuccess(res, user, 'Profile updated')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Profile update failed'
    return sendError(res, message, 400)
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body
    await authService.changePassword(req.user!.userId, currentPassword, newPassword)
    return sendSuccess(res, null, 'Password changed successfully')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Password change failed'
    return sendError(res, message, 400)
  }
}

export async function uploadAvatar(req: Request, res: Response) {
  try {
    if (!req.file) return sendError(res, 'No image provided', 400)
    const { url } = await uploadService.uploadImage(req.file.path)
    const user = await authService.uploadAvatar(req.user!.userId, url)
    return sendSuccess(res, user, 'Avatar uploaded')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Avatar upload failed', 500)
  }
}

export async function deleteAvatar(req: Request, res: Response) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) return sendError(res, 'User not found', 404)

    if (user.profileImage) {
      const publicId = user.profileImage.includes('cloudinary')
        ? user.profileImage.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '')
        : user.profileImage.split('/').pop() || ''
      await uploadService.deleteImage(publicId)
    }

    const updated = await authService.deleteAvatar(req.user!.userId)
    return sendSuccess(res, updated, 'Avatar removed')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to remove avatar', 500)
  }
}
