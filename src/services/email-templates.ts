interface BookingEmailData {
  studentName: string;
  lessonType: string;
  date: string;
  startTime: string;
  endTime: string;
  instructorName: string;
  pickupAddress: string;
  bookingReference: string;
  schoolName: string;
  schoolPhone?: string;
  schoolEmail?: string;
  primaryColor?: string;
  logoUrl?: string;
  cancellationHours?: number;
  googleCalendarUrl?: string;
  outlookCalendarUrl?: string;
  icsDownloadUrl?: string;
  cancellationReason?: string;
}

function baseLayout(content: string, data: Pick<BookingEmailData, 'schoolName' | 'primaryColor' | 'logoUrl' | 'schoolPhone' | 'schoolEmail'>): string {
  const color = data.primaryColor || '#2563eb';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.schoolName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

<!-- Header -->
<tr><td style="background-color:${color};padding:24px 32px;text-align:center;">
${data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.schoolName}" height="40" style="display:inline-block;margin-bottom:8px;">` : ''}
<div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${data.schoolName}</div>
</td></tr>

<!-- Content -->
<tr><td style="padding:32px;">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px;line-height:1.5;">
${data.schoolPhone ? `<a href="tel:${data.schoolPhone}" style="color:${color};text-decoration:none;">${data.schoolPhone}</a>` : ''}
${data.schoolPhone && data.schoolEmail ? ' &middot; ' : ''}
${data.schoolEmail ? `<a href="mailto:${data.schoolEmail}" style="color:${color};text-decoration:none;">${data.schoolEmail}</a>` : ''}
<br>Powered by DriveFlow
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function bookingDetailsBlock(data: BookingEmailData, color: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;margin:16px 0;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:6px 0;color:#6b7280;font-size:13px;width:100px;">Date</td>
<td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${data.date}</td>
</tr>
<tr>
<td style="padding:6px 0;color:#6b7280;font-size:13px;">Time</td>
<td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${data.startTime} — ${data.endTime}</td>
</tr>
<tr>
<td style="padding:6px 0;color:#6b7280;font-size:13px;">Lesson</td>
<td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${data.lessonType}</td>
</tr>
<tr>
<td style="padding:6px 0;color:#6b7280;font-size:13px;">Instructor</td>
<td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${data.instructorName}</td>
</tr>
${data.pickupAddress ? `<tr>
<td style="padding:6px 0;color:#6b7280;font-size:13px;">Pickup</td>
<td style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;">${data.pickupAddress}</td>
</tr>` : ''}
<tr>
<td style="padding:6px 0;color:#6b7280;font-size:13px;">Reference</td>
<td style="padding:6px 0;font-size:14px;font-weight:600;color:${color};">${data.bookingReference}</td>
</tr>
</table>
</td></tr>
</table>`;
}

function calendarButtons(data: BookingEmailData, color: string): string {
  if (!data.googleCalendarUrl && !data.outlookCalendarUrl && !data.icsDownloadUrl) {
    return '';
  }
  const btnStyle = `display:inline-block;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;margin:4px;`;

  return `<div style="text-align:center;margin:24px 0;">
<div style="color:#6b7280;font-size:13px;margin-bottom:12px;">Add to your calendar</div>
${data.googleCalendarUrl ? `<a href="${data.googleCalendarUrl}" target="_blank" style="${btnStyle}background-color:${color};color:#ffffff;">Google Calendar</a>` : ''}
${data.outlookCalendarUrl ? `<a href="${data.outlookCalendarUrl}" target="_blank" style="${btnStyle}background-color:#0078d4;color:#ffffff;">Outlook</a>` : ''}
${data.icsDownloadUrl ? `<a href="${data.icsDownloadUrl}" target="_blank" style="${btnStyle}background-color:#374151;color:#ffffff;">Download .ics</a>` : ''}
</div>`;
}

export function renderConfirmationEmail(data: BookingEmailData): { subject: string; html: string } {
  const color = data.primaryColor || '#2563eb';

  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Booking Confirmed!</h1>
<p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.5;">
Hi ${data.studentName}, your driving lesson has been confirmed.
</p>

${bookingDetailsBlock(data, color)}
${calendarButtons(data, color)}

${data.cancellationHours ? `<p style="margin:20px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
Need to reschedule or cancel? Please let us know at least <strong>${data.cancellationHours} hours</strong> before your lesson.
</p>` : ''}
`;

  return {
    subject: `Booking Confirmed — ${data.lessonType} (${data.bookingReference})`,
    html: baseLayout(content, data),
  };
}

export function renderReminderEmail(data: BookingEmailData): { subject: string; html: string } {
  const color = data.primaryColor || '#2563eb';

  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Lesson Tomorrow!</h1>
<p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.5;">
Hi ${data.studentName}, this is a friendly reminder about your driving lesson tomorrow.
</p>

${bookingDetailsBlock(data, color)}

<p style="margin:20px 0 0;color:#4b5563;font-size:14px;line-height:1.5;">
Please make sure you're at the pickup location on time. See you there!
</p>
`;

  return {
    subject: `Lesson Reminder — Tomorrow at ${data.startTime} (${data.bookingReference})`,
    html: baseLayout(content, data),
  };
}

export function renderRescheduleEmail(data: BookingEmailData): { subject: string; html: string } {
  const color = data.primaryColor || '#2563eb';

  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Booking Rescheduled</h1>
<p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.5;">
Hi ${data.studentName}, your driving lesson has been rescheduled. Here are the updated details:
</p>

${bookingDetailsBlock(data, color)}
${calendarButtons(data, color)}

${data.cancellationHours ? `<p style="margin:20px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
Need to reschedule or cancel again? Please let us know at least <strong>${data.cancellationHours} hours</strong> before your lesson.
</p>` : ''}
`;

  return {
    subject: `Booking Rescheduled — ${data.lessonType} (${data.bookingReference})`,
    html: baseLayout(content, data),
  };
}

export function renderCancellationEmail(data: BookingEmailData): { subject: string; html: string } {
  const content = `
<h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Booking Cancelled</h1>
<p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.5;">
Hi ${data.studentName}, your driving lesson has been cancelled.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;border:1px solid #fecaca;margin:16px 0;">
<tr><td style="padding:20px;">
<div style="font-size:14px;font-weight:600;color:#991b1b;margin-bottom:4px;">${data.lessonType} on ${data.date} at ${data.startTime}</div>
<div style="font-size:13px;color:#991b1b;">Reference: ${data.bookingReference}</div>
${data.cancellationReason ? `<div style="margin-top:8px;font-size:13px;color:#7f1d1d;">Reason: ${data.cancellationReason}</div>` : ''}
</td></tr>
</table>

<p style="margin:20px 0 0;color:#4b5563;font-size:14px;line-height:1.5;">
If you'd like to rebook, please contact us or visit our website.
</p>
`;

  return {
    subject: `Booking Cancelled — ${data.lessonType} (${data.bookingReference})`,
    html: baseLayout(content, data),
  };
}
