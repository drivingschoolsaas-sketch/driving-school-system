'use client';

import { useActionState, useEffect, useState } from 'react';
import { updateProfileAction, type ProfileActionState } from './actions';

interface Props {
  student: {
    phone: string | null;
    pickup_address: string | null;
    pickup_suburb: string | null;
    pickup_postcode: string | null;
    preferred_transmission: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  };
  primaryColor: string;
}

const initialState: ProfileActionState = { success: false };

const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export function ProfileEditForm({ student, primaryColor }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  useEffect(() => {
    if (state.success) setIsOpen(false);
  }, [state]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: primaryColor }}
      >
        Edit Profile
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
            </div>

            <form action={formAction} className="space-y-4 p-6">
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" name="phone" defaultValue={student.phone ?? ''} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Pickup Address</label>
                <input type="text" name="pickup_address" defaultValue={student.pickup_address ?? ''} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Suburb</label>
                  <input type="text" name="pickup_suburb" defaultValue={student.pickup_suburb ?? ''} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Postcode</label>
                  <input type="text" name="pickup_postcode" defaultValue={student.pickup_postcode ?? ''} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Preferred Transmission</label>
                <select name="preferred_transmission" defaultValue={student.preferred_transmission ?? ''} className={inputClass}>
                  <option value="">No preference</option>
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Emergency Contact Name</label>
                <input type="text" name="emergency_contact_name" defaultValue={student.emergency_contact_name ?? ''} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Emergency Contact Phone</label>
                <input type="tel" name="emergency_contact_phone" defaultValue={student.emergency_contact_phone ?? ''} className={inputClass} />
              </div>

              {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}>
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
