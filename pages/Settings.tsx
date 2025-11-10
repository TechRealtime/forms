import React, { useState, useContext, FormEvent } from 'react';
import { AuthContext } from '../App';
import { auth } from '../services/firebase';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

type LoadingState = 'profile' | 'email' | 'password' | null;
type ErrorState = { form: string; message: string } | null;
type SuccessState = { form: string; message: string } | null;

const Settings: React.FC = () => {
    const { currentUser } = useContext(AuthContext);

    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [newEmail, setNewEmail] = useState('');
    const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
    const [currentPasswordForPw, setCurrentPasswordForPw] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [loading, setLoading] = useState<LoadingState>(null);
    const [error, setError] = useState<ErrorState>(null);
    const [success, setSuccess] = useState<SuccessState>(null);

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };
    
    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        clearMessages();
        setLoading('profile');
        try {
            await updateProfile(currentUser, { displayName });
            setSuccess({ form: 'profile', message: 'Profile updated successfully!' });
        } catch (err: any) {
            setError({ form: 'profile', message: err.message });
        } finally {
            setLoading(null);
        }
    };

    const handleEmailUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser || !currentUser.email) return;

        clearMessages();
        setLoading('email');
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPasswordForEmail);
            await reauthenticateWithCredential(currentUser, credential);
            await updateEmail(currentUser, newEmail);
            setSuccess({ form: 'email', message: 'Email updated successfully! Please check your new inbox for a verification email.' });
            setNewEmail('');
        } catch (err: any) {
            setError({ form: 'email', message: `Error: ${err.message}` });
        } finally {
            setLoading(null);
            setCurrentPasswordForEmail('');
        }
    };
    
    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser || !currentUser.email) return;

        clearMessages();
        setLoading('password');
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPasswordForPw);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);
            setSuccess({ form: 'password', message: 'Password changed successfully!' });
            setNewPassword('');
        } catch (err: any) {
            setError({ form: 'password', message: `Error: ${err.message}` });
        } finally {
            setLoading(null);
            setCurrentPasswordForPw('');
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold">Settings</h1>

            <Card title="Profile Information" description="Update your display name.">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <Input
                        label="Display Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your Name"
                    />
                    <div className="flex items-center justify-between">
                         <Button type="submit" loading={loading === 'profile'} loadingText="Saving...">Update Profile</Button>
                         {success?.form === 'profile' && <p className="text-sm text-green-600">{success.message}</p>}
                         {error?.form === 'profile' && <p className="text-sm text-destructive">{error.message}</p>}
                    </div>
                </form>
            </Card>

            <Card title="Update Email" description="Change the email address associated with your account.">
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                     <Input
                        label="New Email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                    />
                    <Input
                        label="Current Password"
                        type="password"
                        value={currentPasswordForEmail}
                        onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                        placeholder="Enter current password to confirm"
                        required
                    />
                    <div className="flex items-center justify-between">
                        <Button type="submit" loading={loading === 'email'} loadingText="Saving...">Update Email</Button>
                        {success?.form === 'email' && <p className="text-sm text-green-600">{success.message}</p>}
                        {error?.form === 'email' && <p className="text-sm text-destructive">{error.message}</p>}
                    </div>
                </form>
            </Card>

            <Card title="Change Password" description="Update your account password.">
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <Input
                        label="Current Password"
                        type="password"
                        value={currentPasswordForPw}
                        onChange={(e) => setCurrentPasswordForPw(e.target.value)}
                        required
                    />
                    <Input
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <div className="flex items-center justify-between">
                        <Button type="submit" loading={loading === 'password'} loadingText="Saving...">Change Password</Button>
                        {success?.form === 'password' && <p className="text-sm text-green-600">{success.message}</p>}
                        {error?.form === 'password' && <p className="text-sm text-destructive">{error.message}</p>}
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default Settings;