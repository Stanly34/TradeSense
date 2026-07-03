import { Router } from 'express'
import * as authController from '../controllers/auth.js'
import { authenticate } from '../middlewares/auth.js'
import { validate } from '../utils/validate.js'
import { upload } from '../middlewares/upload.js'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.js'

const router = Router()

router.post('/register', validate(registerSchema), authController.register)
router.post('/login', validate(loginSchema), authController.login)
router.post('/refresh', authController.refreshToken)
router.post('/logout', authController.logout)
router.post('/logout-all', authenticate, authController.logoutAll)
router.get('/me', authenticate, authController.getMe)
router.post('/verify-email', authController.verifyEmail)
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword)
router.patch('/profile', authenticate, authController.updateProfile)
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword)
router.post('/avatar', authenticate, upload.single('image'), authController.uploadAvatar)

export default router
