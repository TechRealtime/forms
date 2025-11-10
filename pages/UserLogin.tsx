
import React, { useState } from 'react';
// FIX: Split imports from 'react-router-dom' and 'react-router' to handle potential module resolution issues.
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { UserIcon, LockIcon } from '../components/Icons';
import { Submission } from '../types';
import ThemeSwitcher from '../components/ThemeSwitcher';
import Spinner from '../components/ui/Spinner';

const UserSignIn: React.FC = () => {
    const [userId, setUserId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const navigate = useNavigate();

    const handleSwitch = (e: React.MouseEvent<HTMLElement>, path: string) => {
        e.preventDefault();
        setIsSwitching(true);
        setTimeout(() => {
            navigate(path);
        }, 300);
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            // Find campaign(s) with matching PIN
            const campaignsQuery = query(collection(db, 'campaigns'), where('pin', '==', pin));
            const campaignSnapshot = await getDocs(campaignsQuery);

            if (campaignSnapshot.empty) {
                setError('Invalid Campaign PIN.');
                setLoading(false);
                return;
            }

            const campaignIds = campaignSnapshot.docs.map(doc => doc.id);

            // Find user submission across these campaigns
            const submissionId = `${campaignIds[0]}_${userId}`; // This logic assumes one campaign per PIN for simplicity
            const submissionSnapshot = await getDocs(collection(db, 'submissions'));
            
            let foundSubmission: Submission | null = null;
            submissionSnapshot.forEach(doc => {
              if (doc.id.endsWith(`_${userId}`) && campaignIds.includes(doc.data().campaignId)) {
                foundSubmission = { id: doc.id, ...doc.data() } as Submission;
              }
            });

            if (foundSubmission) {
                sessionStorage.setItem('formflow-user', JSON.stringify({
                    userId,
                    campaignId: foundSubmission.campaignId,
                }));
                navigate('/user/form');
            } else {
                setError('User ID not found for this campaign.');
            }

        } catch (err) {
            console.error(err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && (
                <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
                <Spinner size="lg" />
                </div>
            )}
            <div className="flex items-center justify-center min-h-screen bg-secondary">
                <div className={`w-full max-w-sm p-8 space-y-6 bg-card rounded-lg shadow-lg relative animate-in fade-in-0 duration-500 ${isSwitching ? 'animate-out fade-out-0 duration-300 fill-forwards' : ''}`}>
                    <div className="absolute top-4 right-4">
                        <ThemeSwitcher />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-primary">Enterprise Forms</h1>
                        <p className="text-muted-foreground">Participant Portal</p>
                    </div>

                    {error && <p className="text-sm text-center text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
                    
                    <form onSubmit={handleSignIn} className="space-y-4">
                        <Input
                            label="User ID"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            required
                            icon={<UserIcon className="w-5 h-5"/>}
                        />
                        <Input
                            label="Campaign PIN"
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            required
                            icon={<LockIcon className="w-5 h-5"/>}
                        />
                        <Button type="submit" loading={loading} loadingText="" className="w-full">
                            Access Form
                        </Button>
                    </form>

                    <p className="text-xs text-center text-muted-foreground">
                        Enter your assigned User ID and the Campaign PIN to access the form.
                    </p>

                    <div className="text-center pt-4">
                        <Link 
                            to="/admin/login" 
                            onClick={(e) => handleSwitch(e, '/admin/login')}
                            className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
                        >
                            Are you an administrator?
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserSignIn;