<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends BaseResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));

        $resetUrl = $frontendUrl . '/reset-password'
            . '?token=' . $this->token
            . '&email=' . urlencode($notifiable->getEmailForPasswordReset());

        return (new MailMessage)
            ->subject('Reset Password — Event Stock')
            ->view('emails.reset-password', ['resetUrl' => $resetUrl]);
    }
}
