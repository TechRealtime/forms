

import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
// FIX: Changed import from 'react-router-dom' to 'react-router' to handle potential module resolution issues.
import { useNavigate } from 'react-router';
import { collection, query, where, onSnapshot, addDoc, Timestamp, doc, updateDoc, writeBatch, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import Papa from 'papaparse';

import { db } from '../services/firebase';
import { AuthContext } from '../App';
import { Campaign, CampaignStatus, FormField, FormFieldType, CampaignTheme, Submission } from '../types';

import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import Card from '../components/ui/Card';
import { PlusIcon, EyeIcon, UserIcon, EllipsisVerticalIcon, EditIcon, Trash2Icon, ArchiveIcon, ArchiveRestoreIcon, BarChartIcon, CopyIcon, DownloadIcon, SendIcon, FilePenLineIcon } from '../components/Icons';

// A helper dropdown component for campaign actions
const CampaignActions: React.FC<{ 
    campaign: Campaign; 
    onEdit: () => void; 
    onClose: () => void; 
    onReopen: () => void; 
    onDelete: () => void;
    onLaunch: () => void;
    onMoveToDraft: () => void;
    onViewAnalytics: () => void; 
}> = ({ campaign, onEdit, onClose, onReopen, onDelete, onLaunch, onMoveToDraft, onViewAnalytics }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const actions = [];
    
    if (campaign.status === CampaignStatus.DRAFT) {
        actions.push({ label: 'Edit', icon: <EditIcon className="w-4 h-4 mr-2" />, action: onEdit });
        actions.push({ label: 'Launch', icon: <SendIcon className="w-4 h-4 mr-2" />, action: onLaunch });
    } else if (campaign.status === CampaignStatus.CLOSED) {
        actions.push({ label: 'Analytics', icon: <BarChartIcon className="w-4 h-4 mr-2" />, action: onViewAnalytics });
        actions.push({ label: 'Reopen', icon: <ArchiveRestoreIcon className="w-4 h-4 mr-2" />, action: onReopen });
    } else { // ACTIVE or PAUSED
        actions.push({ label: 'Edit', icon: <EditIcon className="w-4 h-4 mr-2" />, action: onEdit });
        actions.push({ label: 'Analytics', icon: <BarChartIcon className="w-4 h-4 mr-2" />, action: onViewAnalytics });
        actions.push({ label: 'Close', icon: <ArchiveIcon className="w-4 h-4 mr-2" />, action: onClose });
        actions.push({ label: 'Move to Draft', icon: <FilePenLineIcon className="w-4 h-4 mr-2" />, action: onMoveToDraft });
    }
    // Delete is always an option
    actions.push({ label: 'Delete', icon: <Trash2Icon className="w-4 h-4 mr-2 text-destructive" />, action: onDelete, className: 'text-destructive hover:bg-destructive/10' });


    return (
        <div className="relative" ref={dropdownRef}>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="p-2 h-auto">
                <EllipsisVerticalIcon className="w-5 h-5" />
            </Button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-10">
                    <ul className="py-1">
                        {actions.map(({ label, icon, action, className }) => (
                            <li key={label}>
                                <button onClick={() => { action(); setIsOpen(false); }} className={`w-full text-left flex items-center px-4 py-2 text-sm hover:bg-secondary ${className || ''}`}>
                                    {icon}
                                    {label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const Campaigns: React.FC = () => {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Active' | 'Completed' | 'Draft'>('Active');
    
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [submissionFilter, setSubmissionFilter] = useState<'All' | 'Pending' | 'Submitted' | 'Updated'>('All');
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [campaignToModify, setCampaignToModify] = useState<Campaign | null>(null);
    const [confirmModalProps, setConfirmModalProps] = useState({ title: '', message: '', onConfirm: async () => {}, variant: 'primary' as 'primary' | 'danger' });

    const [createStep, setCreateStep] = useState(1);
    const [newCampaign, setNewCampaign] = useState({ name: '', pin: '', theme: 'blue' as CampaignTheme, description: 'Please fill out or update your information below.' });
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [fields, setFields] = useState<FormField[]>([]);
    const [userIdColumn, setUserIdColumn] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);
    const [modalError, setModalError] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);
        const q = query(collection(db, "campaigns"), where("adminId", "==", currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const campaignsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
            setCampaigns(campaignsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching campaigns:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleViewSubmissions = useCallback(async (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setLoadingSubmissions(true);
        const q = query(collection(db, "submissions"), where("campaignId", "==", campaign.id));
        const snapshot = await getDocs(q);
        const subs = snapshot.docs.map(d => ({id: d.id, ...d.data()}) as Submission);
        setSubmissions(subs);
        setLoadingSubmissions(false);
    }, []);

    // Campaign Actions
    const handleUpdateCampaign = async (id: string, data: Partial<Campaign>) => {
        await updateDoc(doc(db, 'campaigns', id), data);
        setIsEditModalOpen(false);
        setCampaignToModify(null);
    };

    const handleCloseCampaign = async (id: string) => {
        await updateDoc(doc(db, 'campaigns', id), { status: CampaignStatus.CLOSED, closedAt: Timestamp.now() });
        setIsConfirmModalOpen(false);
    };
    
    const handleReopenCampaign = async (id: string) => {
        await updateDoc(doc(db, 'campaigns', id), { status: CampaignStatus.ACTIVE, closedAt: null }); // Remove closedAt
        setIsConfirmModalOpen(false);
    };

    const handleLaunchCampaign = async (id: string) => {
        await updateDoc(doc(db, 'campaigns', id), { status: CampaignStatus.ACTIVE });
        setIsConfirmModalOpen(false);
    };

    const handleMoveToDrafts = async (id: string) => {
        await updateDoc(doc(db, 'campaigns', id), { status: CampaignStatus.DRAFT });
        setIsConfirmModalOpen(false);
    };

    const handleDeleteCampaign = async (id: string) => {
        const submissionsQuery = query(collection(db, "submissions"), where("campaignId", "==", id));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        
        const batch = writeBatch(db);
        submissionsSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(doc(db, 'campaigns', id));
        
        await batch.commit();
        setIsConfirmModalOpen(false);
        if (selectedCampaign?.id === id) setSelectedCampaign(null);
    };
    
    const handleViewAnalytics = (campaignId: string) => {
        navigate(`/admin/campaigns/${campaignId}/analytics`);
    };

    // Modal Triggers
    const openEditModal = (campaign: Campaign) => {
        setCampaignToModify(campaign);
        setIsEditModalOpen(true);
    };
    const openConfirmModal = (campaign: Campaign, type: 'close' | 'reopen' | 'delete' | 'launch' | 'moveToDraft') => {
        setCampaignToModify(campaign);
        switch (type) {
            case 'close':
                setConfirmModalProps({ title: 'Close Campaign?', message: `Are you sure you want to close "${campaign.name}"? Users will no longer be able to submit forms.`, onConfirm: () => handleCloseCampaign(campaign.id), variant: 'primary' });
                break;
            case 'reopen':
                setConfirmModalProps({ title: 'Reopen Campaign?', message: `Are you sure you want to reopen "${campaign.name}"? Users will be able to submit forms again.`, onConfirm: () => handleReopenCampaign(campaign.id), variant: 'primary' });
                break;
            case 'delete':
                setConfirmModalProps({ title: 'Delete Campaign?', message: `Are you sure? This will permanently delete "${campaign.name}" and all its submissions. This action cannot be undone.`, onConfirm: () => handleDeleteCampaign(campaign.id), variant: 'danger' });
                break;
            case 'launch':
                setConfirmModalProps({ title: 'Launch Campaign?', message: `Are you sure you want to launch "${campaign.name}"? It will become active and accessible to users.`, onConfirm: () => handleLaunchCampaign(campaign.id), variant: 'primary' });
                break;
            case 'moveToDraft':
                setConfirmModalProps({ title: 'Move to Drafts?', message: `Are you sure you want to move "${campaign.name}" to drafts? It will become inactive and hidden from users.`, onConfirm: () => handleMoveToDrafts(campaign.id), variant: 'primary' });
                break;
        }
        setIsConfirmModalOpen(true);
    };

    const campaignsByStatus = useMemo(() => ({
        Active: campaigns.filter(c => c.status === CampaignStatus.ACTIVE || c.status === CampaignStatus.PAUSED),
        Completed: campaigns.filter(c => c.status === CampaignStatus.CLOSED),
        Draft: campaigns.filter(c => c.status === CampaignStatus.DRAFT),
    }), [campaigns]);
    const displayedCampaigns = campaignsByStatus[activeTab];

    const filteredSubmissions = useMemo(() => submissions.filter(s => {
        if (submissionFilter === 'All') return true;
        return s.status === submissionFilter;
    }), [submissions, submissionFilter]);

    // Create Campaign Logic
    const resetCreateModal = useCallback(() => {
        setIsCreateModalOpen(false); setCreateStep(1); setNewCampaign({ name: '', pin: '', theme: 'blue', description: 'Please fill out or update your information below.' });
        setCsvFile(null); setCsvHeaders([]); setCsvData([]); setFields([]); setUserIdColumn(''); setIsCreating(false); setModalError('');
    }, []);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setCsvFile(file);
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) { setModalError('Error parsing CSV file.'); return; }
                const headers = results.meta.fields || [];
                setCsvHeaders(headers); setCsvData(results.data);
                if (headers.length > 0) setUserIdColumn(headers[0]);
                setModalError(results.data.length > 0 ? '' : 'CSV file is empty.');
            }
        });
    };
    const handleStep1Next = () => {
        if (!newCampaign.name.trim()) { setModalError('Campaign Name is required.'); return; }
        if (newCampaign.pin.length < 4) { setModalError('Campaign PIN must be at least 4 digits.'); return; }
        setModalError(''); setCreateStep(2);
    };
    const handleStep2Next = () => {
        if (!csvFile || csvData.length === 0) { setModalError('Please upload a valid CSV file with participant data.'); return; }
        setModalError('');
        const initialFields = csvHeaders.map(header => ({
            id: header.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(), label: header, type: FormFieldType.TEXT, required: false, originalHeader: header,
        }));
        setFields(initialFields); setCreateStep(3);
    };

    const processAndCreateCampaign = async (status: CampaignStatus.ACTIVE | CampaignStatus.DRAFT) => {
        if (!currentUser || !csvFile || csvData.length === 0) return;
        setIsCreating(true); setModalError('');
        try {
            if (!userIdColumn) throw new Error("You must select a column to use as the User ID.");
            if (new Set(csvData.map(row => row[userIdColumn])).size !== csvData.length) throw new Error(`User ID column '${userIdColumn}' contains duplicate values.`);
            
            const campaignDocRef = doc(collection(db, 'campaigns'));
            
            await setDoc(campaignDocRef, {
                name: newCampaign.name, pin: newCampaign.pin, theme: newCampaign.theme, status: status,
                fields: fields, adminId: currentUser.uid, createdAt: Timestamp.now(), participantCount: csvData.length, submissionCount: 0,
                description: newCampaign.description,
            });
            
            const batch = writeBatch(db);
            csvData.forEach(row => {
                const userId = row[userIdColumn];
                if(userId) {
                    const submissionRef = doc(db, 'submissions', `${campaignDocRef.id}_${userId}`);
                    batch.set(submissionRef, { campaignId: campaignDocRef.id, campaignName: newCampaign.name, status: 'Pending', data: row });
                }
            });
            await batch.commit();

            resetCreateModal();
        } catch (error) {
            setModalError((error as Error).message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = () => {
        if (!selectedCampaign) return;
        const headers = selectedCampaign.fields.map(f => f.label).join('\t');
        const rows = filteredSubmissions.map(s => {
            return selectedCampaign.fields.map(f => s.data[f.originalHeader] || '').join('\t');
        }).join('\n');
        const tsv = `${headers}\n${rows}`;
        navigator.clipboard.writeText(tsv);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExport = () => {
        if (!selectedCampaign) return;
        const dataToExport = filteredSubmissions.map(s => {
            const row: { [key: string]: any } = {};
            selectedCampaign.fields.forEach(f => {
                row[f.label] = s.data[f.originalHeader];
            });
            return row;
        });
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${selectedCampaign.name}_submissions.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    if(loading) return <div className="flex h-full items-center justify-center"><Spinner size="lg" /></div>;

    if (selectedCampaign) {
        return (
            <div>
                 <Button onClick={() => setSelectedCampaign(null)} className="mb-4">
                    &larr; Back to Campaigns
                </Button>
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-3xl font-bold">{selectedCampaign.name} Submissions</h1>
                        <p className="text-muted-foreground">Total Submissions: {submissions.filter(s=>s.status !== 'Pending').length} / {selectedCampaign.participantCount}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button onClick={handleCopy} variant="secondary" size="sm">
                            <CopyIcon className="w-4 h-4 mr-2" />
                            {copied ? 'Copied!' : 'Copy Data'}
                        </Button>
                        <Button onClick={handleExport} variant="secondary" size="sm">
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                <div className="flex space-x-2 mb-4">
                    {(['All', 'Pending', 'Submitted', 'Updated'] as const).map(status => (
                        <Button key={status} variant={submissionFilter === status ? 'primary' : 'secondary'} size="sm" onClick={() => setSubmissionFilter(status)}>{status}</Button>
                    ))}
                </div>

                {loadingSubmissions ? <Spinner /> : (
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs uppercase bg-secondary">
                                <tr>
                                    {selectedCampaign.fields.map(f => <th key={f.id} className="px-6 py-3 border border-border">{f.label}</th>)}
                                    <th className="px-6 py-3 border border-border">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubmissions.map(s => (
                                    <tr key={s.id} className="border-b border-border hover:bg-secondary/50">
                                        {selectedCampaign.fields.map(f => <td key={f.id} className="px-6 py-4 whitespace-nowrap border border-border">{s.data[f.originalHeader]}</td>)}
                                        <td className="px-6 py-4 border border-border">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${ s.status === 'Submitted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : s.status === 'Updated' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{s.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {filteredSubmissions.length === 0 && <p className="p-6 text-center text-muted-foreground">No submissions match the current filter.</p>}
                    </Card>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Campaigns</h1>
                <Button onClick={() => setIsCreateModalOpen(true)}><PlusIcon className="w-5 h-5 mr-2"/>Create Campaign</Button>
            </div>
            
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6">
                    {(['Active', 'Completed', 'Draft'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayedCampaigns.map(campaign => (
                    <Card key={campaign.id} className="flex flex-col">
                        <div className="p-6 flex-1">
                             <div className="flex justify-between items-start">
                                <h3 className="text-xl font-semibold mb-2 pr-2">{campaign.name}</h3>
                                <CampaignActions 
                                    campaign={campaign} 
                                    onEdit={() => openEditModal(campaign)} 
                                    onClose={() => openConfirmModal(campaign, 'close')} 
                                    onReopen={() => openConfirmModal(campaign, 'reopen')} 
                                    onDelete={() => openConfirmModal(campaign, 'delete')}
                                    onLaunch={() => openConfirmModal(campaign, 'launch')}
                                    onMoveToDraft={() => openConfirmModal(campaign, 'moveToDraft')}
                                    onViewAnalytics={() => handleViewAnalytics(campaign.id)}
                                />
                            </div>
                            <p className="text-muted-foreground text-sm mb-4">PIN: {campaign.pin}</p>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                campaign.status === CampaignStatus.ACTIVE ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                campaign.status === CampaignStatus.DRAFT ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>{campaign.status}</span>
                        </div>
                        <div className="p-6 border-t border-border mt-auto">
                           <div className="flex justify-between items-center">
                                <div><UserIcon className="w-4 h-4 inline-block mr-1" /><span className="text-sm">{campaign.submissionCount || 0} / {campaign.participantCount || 0}</span></div>
                                <Button size="sm" onClick={() => handleViewSubmissions(campaign)}><EyeIcon className="w-4 h-4 mr-2" />View</Button>
                           </div>
                        </div>
                    </Card>
                ))}
            </div>
            {displayedCampaigns.length === 0 && <p className="text-center py-8 text-muted-foreground">No {activeTab.toLowerCase()} campaigns found.</p>}

            {/* Modals */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Campaign" size="xl">
                {modalError && <p className="text-sm text-center text-destructive bg-destructive/10 p-3 rounded-md mb-4">{modalError}</p>}
                {createStep === 1 && (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Step 1: Basic Info</h3>
                        <Input label="Campaign Name" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} />
                        <Input label="Campaign PIN (4-8 digits)" type="text" maxLength={8} value={newCampaign.pin} onChange={e => setNewCampaign({...newCampaign, pin: e.target.value.replace(/\D/g, '')})} />
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Description (Optional)</label>
                            <textarea value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} className="w-full p-2 border border-input rounded-md bg-transparent min-h-[100px]" placeholder="Instructions for participants..."></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Theme</label>
                            <select value={newCampaign.theme} onChange={e => setNewCampaign({...newCampaign, theme: e.target.value as CampaignTheme})} className="w-full p-2 border border-input rounded-md bg-transparent">
                                <option value="blue">Blue</option><option value="red">Red</option><option value="green">Green</option><option value="purple">Purple</option><option value="orange">Orange</option>
                            </select>
                        </div>
                         <div className="flex justify-between items-center pt-4">
                            <Button variant="ghost" onClick={resetCreateModal}>Cancel</Button>
                            <Button onClick={handleStep1Next}>Next</Button>
                        </div>
                    </div>
                )}
                 {createStep === 2 && (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Step 2: Upload Participants (CSV)</h3>
                        <p className="text-sm text-muted-foreground">Upload a CSV file with participant data. Make sure it includes a unique identifier column.</p>
                        <Input type="file" accept=".csv" onChange={handleFileChange} />
                         {csvHeaders.length > 0 && <p className="text-sm">Detected {csvData.length} users and {csvHeaders.length} columns.</p>}
                        <div className="flex justify-between items-center pt-4"><Button variant="secondary" onClick={() => { setCreateStep(1); setModalError(''); }}>Back</Button><Button onClick={handleStep2Next}>Next</Button></div>
                    </div>
                )}
                 {createStep === 3 && (
                     <div className="space-y-4">
                        <h3 className="font-semibold">Step 3: Configure Form Fields</h3>
                        <p className="text-sm text-muted-foreground">Customize fields and select a unique User ID column.</p>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Select User ID Column <span className="text-destructive">*</span></label>
                            <select value={userIdColumn} onChange={e => setUserIdColumn(e.target.value)} className="w-full p-2 border border-input rounded-md bg-transparent">
                                {csvHeaders.map(header => <option key={header} value={header}>{header}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto p-2 border rounded-md">
                        {fields.map((field, index) => (
                            <div key={index} className="grid grid-cols-4 gap-2 items-center">
                                <Input value={field.label} onChange={e => setFields(f => f.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}/>
                                <select value={field.type} onChange={e => setFields(f => f.map((item, i) => i === index ? { ...item, type: e.target.value as FormFieldType } : item))} className="w-full p-2 border border-input rounded-md bg-transparent col-span-2">
                                    {Object.values(FormFieldType).map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                                <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={field.required} onChange={e => setFields(f => f.map((item, i) => i === index ? { ...item, required: e.target.checked } : item))}/><span>Required</span></label>
                            </div>
                        ))}
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <Button variant="secondary" onClick={() => { setCreateStep(2); setModalError(''); }}>Back</Button>
                            <div className="flex items-center space-x-2">
                                <Button variant="secondary" onClick={() => processAndCreateCampaign(CampaignStatus.DRAFT)} loading={isCreating}>Save as Draft</Button>
                                <Button onClick={() => processAndCreateCampaign(CampaignStatus.ACTIVE)} loading={isCreating}>Create and Launch</Button>
                            </div>
                        </div>
                     </div>
                 )}
            </Modal>
            
            {campaignToModify && (
                <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setCampaignToModify(null); }} title={`Edit ${campaignToModify.name}`}>
                    <div className="space-y-4">
                        <Input label="Campaign Name" value={campaignToModify.name} onChange={e => setCampaignToModify(c => c ? { ...c, name: e.target.value } : null)} />
                        <Input label="Campaign PIN" value={campaignToModify.pin} onChange={e => setCampaignToModify(c => c ? { ...c, pin: e.target.value.replace(/\D/g, '') } : null)} />
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Theme</label>
                            <select value={campaignToModify.theme} onChange={e => setCampaignToModify(c => c ? { ...c, theme: e.target.value as CampaignTheme } : null)} className="w-full p-2 border border-input rounded-md bg-transparent">
                                <option value="blue">Blue</option><option value="red">Red</option><option value="green">Green</option><option value="purple">Purple</option><option value="orange">Orange</option>
                            </select>
                        </div>
                        <Button onClick={() => handleUpdateCampaign(campaignToModify.id, { name: campaignToModify.name, pin: campaignToModify.pin, theme: campaignToModify.theme })}>Save Changes</Button>
                    </div>
                </Modal>
            )}
            
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title={confirmModalProps.title} size="sm">
                <p className="text-muted-foreground">{confirmModalProps.message}</p>
                <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                    <Button variant={confirmModalProps.variant} onClick={confirmModalProps.onConfirm}>Confirm</Button>
                </div>
            </Modal>
        </div>
    );
};

export default Campaigns;
