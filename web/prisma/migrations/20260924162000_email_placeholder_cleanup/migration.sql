-- Email-only accounts must not pretend to have a phone number (REQ-005..008).
UPDATE users SET phone = NULL
WHERE email IS NOT NULL AND phone = 'email_' || email;
