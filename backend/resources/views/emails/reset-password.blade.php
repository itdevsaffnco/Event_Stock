<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
                            <p style="margin:0;color:#c7d2fe;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Saff &amp; Co.</p>
                            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Event Stock</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">Reset Password</h2>
                            <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                                Halo, kami menerima permintaan untuk mereset password akun Anda.
                                Klik tombol di bawah untuk melanjutkan.
                            </p>

                            <div style="text-align:center;margin:32px 0;">
                                <a href="{{ $resetUrl }}"
                                   style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;">
                                    Reset Password Saya
                                </a>
                            </div>

                            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;line-height:1.6;">
                                Link ini akan kadaluarsa dalam <strong>60 menit</strong>.
                            </p>
                            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                                Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.
                                Password Anda tidak akan berubah.
                            </p>

                            <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;">

                            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                                Jika tombol tidak berfungsi, salin dan tempel URL berikut ke browser Anda:<br>
                                <span style="color:#4f46e5;word-break:break-all;">{{ $resetUrl }}</span>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="margin:0;color:#94a3b8;font-size:12px;">
                                &copy; {{ date('Y') }} Saff &amp; Co. Event Stock &mdash; Pesan ini dikirim otomatis, jangan dibalas.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
