import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div>
      <Header title="Settings" subtitle="Practice account settings" />
      <div className="p-6 max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Practice settings coming soon.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Notification settings coming soon.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API & Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Integration settings coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
