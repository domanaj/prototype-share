import { flag } from '@vercel/flags/next';

export const ipRestriction = flag<boolean>({
  key: 'ip-restriction',
  description: 'Restrict all access (view, comment, publish) to allowed IPs only',
  defaultValue: false,
  decide() {
    return false;
  },
});
