
import React, { useState, useEffect, useCallback } from 'react';
// FIX: Changed import from 'react-router-dom' to 'react-router' to handle potential module resolution issues.
import { useNavigate } from 'react-router';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { Campaign, Submission, FormField, FormFieldType, CampaignStatus } from '../types';
import Spinner from '../components/ui/Spinner';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { SignOutIcon, SendIcon } from '../components/Icons';

const themeClasses = {
    blue: { text: 'text-theme-primary-600 dark:text-theme-primary-400', bg: 'bg-theme-primary-600 hover:bg-theme-primary-700', ring: 'focus:ring-theme-primary-500' },
    red: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-600 hover:bg-red-700', ring: 'focus:ring-red-500' },
    purple: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600 hover:bg-purple-700', ring: 'focus:ring-purple-500' },
    orange: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-600 hover:bg-orange-700', ring: 'focus:ring-orange-500' },
    green: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-600 hover:bg-green-700', ring: 'focus:ring-green-500' },
};

const themeRingColors = {
    blue: '37 99 235',
    red: '220 38 38',
    purple: '124 58 237',
    orange: '234 88 12',
    green: '22 163 74',
};


const UserForm: React.FC = () => {
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [formData, setFormData] = useState<{ [key: string]: any }>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    
    const [userAuth, setUserAuth] = useState<{ userId: string; campaignId: string } | null>(null);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('formflow-user');
        if (storedUser) {
            setUserAuth(JSON.parse(storedUser));
        } else {
            navigate('/user/login');
        }
    }, [navigate]);

    const fetchData = useCallback(async () => {
        if (!userAuth) return;
        setLoading(true);
        try {
            const campaignDoc = await getDoc(doc(db, 'campaigns', userAuth.campaignId));
            if (!campaignDoc.exists()) throw new Error('Campaign not found.');
            
            const submissionId = `${userAuth.campaignId}_${userAuth.userId}`;
            const submissionDoc = await getDoc(doc(db, 'submissions', submissionId));
            if (!submissionDoc.exists()) throw new Error('Submission not found.');

            const campData = { id: campaignDoc.id, ...campaignDoc.data() } as Campaign;
            const subData = { id: submissionDoc.id, ...submissionDoc.data() } as Submission;

            setCampaign(campData);
            setSubmission(subData);
            setFormData(subData.data);
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userAuth]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (fieldId: string, value: any) => {
        const field = campaign?.fields.find(f => f.id === fieldId);
        if (!field) return;

        setFormData(prev => ({ ...prev, [field.originalHeader]: value }));
    };

    const handleFileChange = async (field: FormField, file: File | null) => {
        if (!file || !userAuth) return;

        const filePath = `submissions/${userAuth.campaignId}/${userAuth.userId}/${field.id}/${file.name}`;
        const fileRef = ref(storage, filePath);
        
        try {
            setUploadProgress(prev => ({ ...prev, [field.id]: 0 }));
            // Note: For real progress, need to use uploadBytesResumable, but this is simpler for the example.
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            handleInputChange(field.id, downloadURL);
            setUploadProgress(prev => ({ ...prev, [field.id]: 100 }));
        } catch (error) {
            console.error("File upload error:", error);
            setError(`Failed to upload ${field.label}`);
            setUploadProgress(prev => ({ ...prev, [field.id]: -1 })); // Indicate error
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        if (!submission || !userAuth || !campaign) return;

        if (campaign.status === CampaignStatus.CLOSED) {
            setError("This campaign is closed and no longer accepts submissions.");
            setSubmitting(false);
            return;
        }
        
        try {
            const submissionRef = doc(db, 'submissions', submission.id);
            const newStatus = submission.status === 'Pending' ? 'Submitted' : 'Updated';
            
            await updateDoc(submissionRef, {
                data: formData,
                status: newStatus,
                ...(newStatus === 'Submitted' && { submittedAt: Timestamp.now() }),
                ...(newStatus === 'Updated' && { updatedAt: Timestamp.now() }),
            });

            // Update campaign submission count
            const campaignRef = doc(db, 'campaigns', userAuth.campaignId);
            const campaignDoc = await getDoc(campaignRef);
            if(campaignDoc.exists() && newStatus === 'Submitted') {
                const currentCount = campaignDoc.data().submissionCount || 0;
                await updateDoc(campaignRef, { submissionCount: currentCount + 1 });
            }

            alert(`Form ${newStatus} successfully!`);
            fetchData(); // Refresh data to show updated state
        } catch (err) {
            console.error(err);
            setError('Failed to submit form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
    
    const handleSignOut = () => {
        sessionStorage.removeItem('formflow-user');
        navigate('/user/login');
    };


    const renderField = (field: FormField) => {
        const value = formData[field.originalHeader] || '';
        
        switch (field.type) {
            case FormFieldType.FILE:
                return (
                    <div>
                        <Input
                            type="file"
                            onChange={e => handleFileChange(field, e.target.files ? e.target.files[0] : null)}
                            required={field.required}
                        />
                         {uploadProgress[field.id] > 0 && uploadProgress[field.id] < 100 && <p className="text-xs mt-1">Uploading...</p>}
                         {uploadProgress[field.id] === 100 && <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">View Uploaded File</a>}
                         {uploadProgress[field.id] === -1 && <p className="text-xs text-red-500 mt-1">Upload Failed</p>}
                    </div>
                );
            case FormFieldType.LONG_TEXT:
                return <textarea value={value} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} className="w-full p-2 border border-input rounded-md bg-transparent min-h-[100px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />;
            // Add other field types like dropdown, date
            default:
                return <Input type={field.type.toLowerCase()} value={value} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} />;
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
    if (error) return <div className="flex h-screen items-center justify-center text-destructive p-4 text-center">{error}</div>;
    if (!campaign || !submission) return null;

    if (campaign.status === CampaignStatus.CLOSED) {
        return (
            <div className="flex h-screen items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Campaign Closed</h1>
                    <p className="text-muted-foreground">
                        This campaign was closed on {campaign.closedAt?.toDate().toLocaleString() || 'N/A'}.
                        <br/>
                        Submissions are no longer accepted.
                    </p>
                    <Button onClick={handleSignOut} className="mt-4">
                        Return to Sign In
                    </Button>
                </div>
            </div>
        );
    }
    
    const currentTheme = themeClasses[campaign.theme] || themeClasses.blue;
    const currentRingColor = themeRingColors[campaign.theme] || themeRingColors.blue;

    return (
        <>
            <div className="min-h-screen bg-secondary p-4 sm:p-8 flex items-center justify-center">
                <div 
                    className="w-full max-w-2xl bg-card rounded-lg shadow-lg p-8"
                    style={{ '--ring': currentRingColor } as React.CSSProperties}
                >
                    <h1 className={`text-3xl font-bold mb-2 ${currentTheme.text}`}>{campaign.name}</h1>
                    <p className="text-muted-foreground mb-6">{campaign.description || 'Please fill out or update your information below.'}</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {campaign.fields.map(field => (
                            <div key={field.id}>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    {field.label} {field.required && <span className="text-destructive">*</span>}
                                </label>
                                {renderField(field)}
                            </div>
                        ))}
                        <div className="pt-4 flex items-center justify-between">
                            <Button type="button" variant="secondary" onClick={() => setIsFinishModalOpen(true)}>
                                <SignOutIcon className="w-5 h-5 mr-2"/>
                                Finish Session
                            </Button>
                            <Button type="submit" loading={submitting} loadingText="Updating..." className={`${currentTheme.bg} text-white ${currentTheme.ring}`}>
                                <SendIcon className="w-5 h-5 mr-2" />
                                {submission.status === 'Pending' ? 'Submit' : 'Update'}
                            </Button>
                        </div>
                         {(submission.status === 'Submitted' || submission.status === 'Updated') && (
                            <p className="text-center text-sm text-green-600 font-semibold mt-4 bg-green-500/10 p-3 rounded-md">
                                You have already {submission.status.toLowerCase()} this form. You can make changes and update your submission.
                            </p>
                        )}
                    </form>
                </div>
            </div>
            <Modal
                isOpen={isFinishModalOpen}
                onClose={() => setIsFinishModalOpen(false)}
                title="Finish Session"
                size="sm"
            >
                <div className="space-y-4">
                    <p>Are you sure you have finished and want to sign out?</p>
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setIsFinishModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleSignOut}>
                            Sign Out
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default UserForm;