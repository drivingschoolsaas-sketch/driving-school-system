// ==================================================
// Student Portal — Profile
// ==================================================
// Shows the student's profile information with editing.

import { getPortalContext } from '@/lib/auth';
import type { Metadata } from 'next';
import { ProfileEditForm } from './profile-edit-form';

export const metadata: Metadata = {
  title: 'My Profile',
};

export default async function PortalProfilePage() {
  const { student, settings } = await getPortalContext();
  const primaryColor = settings?.primary_color ?? '#2563eb';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your personal information and preferences.
        </p>
      </div>

      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          {student.display_name.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {student.display_name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {student.email ?? 'No email on file'}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              student.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {student.is_active ? 'Active Student' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Personal Details */}
      <ProfileSection title="Personal Details" icon="👤">
        <ProfileRow label="Full Name" value={student.display_name} />
        <ProfileRow label="Phone" value={student.phone} />
        <ProfileRow label="Email" value={student.email} />
        <ProfileRow label="Date of Birth" value={student.date_of_birth
          ? new Date(student.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : null
        } />
      </ProfileSection>

      {/* Pickup Details */}
      <ProfileSection title="Pickup Details" icon="📍">
        <ProfileRow label="Address" value={student.pickup_address} />
        <ProfileRow label="Suburb" value={student.pickup_suburb} />
        <ProfileRow label="Postcode" value={student.pickup_postcode} />
      </ProfileSection>

      {/* Driving Details */}
      <ProfileSection title="Driving Details" icon="🚗">
        <ProfileRow label="Preferred Transmission" value={student.preferred_transmission} capitalize />
        <ProfileRow label="Learner Permit" value={student.learner_permit_number} />
        <ProfileRow
          label="Permit Expiry"
          value={student.permit_expiry
            ? new Date(student.permit_expiry + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : null
          }
        />
      </ProfileSection>

      {/* Emergency Contact */}
      <ProfileSection title="Emergency Contact" icon="🆘">
        <ProfileRow label="Name" value={student.emergency_contact_name} />
        <ProfileRow label="Phone" value={student.emergency_contact_phone} />
      </ProfileSection>

      {/* Edit Button */}
      <div className="text-center">
        <ProfileEditForm
          student={{
            phone: student.phone,
            pickup_address: student.pickup_address,
            pickup_suburb: student.pickup_suburb,
            pickup_postcode: student.pickup_postcode,
            preferred_transmission: student.preferred_transmission,
            emergency_contact_name: student.emergency_contact_name,
            emergency_contact_phone: student.emergency_contact_phone,
          }}
          primaryColor={primaryColor}
        />
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-5 py-3">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700 px-5">
        {children}
      </div>
    </section>
  );
}

function ProfileRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string | null;
  capitalize?: boolean;
}) {
  const displayValue = value || 'Not provided';
  const isNotSet = !value;

  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span
        className={`text-sm text-right truncate ${
          isNotSet
            ? 'text-gray-400 dark:text-gray-500 italic'
            : 'text-gray-900 dark:text-white font-medium'
        } ${capitalize ? 'capitalize' : ''}`}
      >
        {displayValue}
      </span>
    </div>
  );
}
