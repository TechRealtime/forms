

import React, { useEffect, useState, useContext } from 'react';
// FIX: Split imports from 'react-router-dom' and 'react-router' to handle potential module resolution issues.
import { Link } from 'react-router-dom';
import { useParams } from 'react-router';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { Campaign, Submission } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface MetricCardProps {
    title: string;
    value: string | number;
    description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description }) => (
    <Card>
        <div className="flex flex-col space-y-1.5">
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-semibold">{value}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    </Card>
);

const CampaignAnalytics: React.FC = () => {
    const { campaignId } = useParams<{ campaignId: string }>();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [timeFilter, setTimeFilter] = useState<'all' | '48h' | '60m' | 'custom'>('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [chartColors, setChartColors] = useState({
        primary: 'blue',
        mutedForeground: 'gray',
        border: 'lightgray',
        card: 'white',
    });

    useEffect(() => {
        const getCssVar = (name: string) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;
        const updateChartColors = () => {
            setChartColors({
                primary: getCssVar('--primary'),
                mutedForeground: getCssVar('--muted-foreground'),
                border: getCssVar('--border'),
                card: getCssVar('--card'),
            });
        };
        updateChartColors();
        const observer = new MutationObserver(() => updateChartColors());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!campaignId) return;
        
        const fetchCampaignData = async () => {
            setLoading(true);
            try {
                const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
                if (campaignDoc.exists()) {
                    setCampaign({ id: campaignDoc.id, ...campaignDoc.data() } as Campaign);
                }

                const submissionsQuery = query(collection(db, "submissions"), where("campaignId", "==", campaignId));
                const submissionsSnapshot = await getDocs(submissionsQuery);
                const submissionsData = submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
                setSubmissions(submissionsData);
            } catch (error) {
                console.error("Error fetching campaign analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaignData();
    }, [campaignId]);

    useEffect(() => {
        if (submissions.length === 0) {
            setChartData([]);
            return;
        }

        let filteredSubmissions = submissions.filter(s => s.submittedAt);
        let dateFilter: (sub: Submission) => boolean;
        const now = new Date();

        switch (timeFilter) {
            case '60m':
                const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
                dateFilter = sub => (sub.submittedAt as Timestamp).toDate() > sixtyMinutesAgo;
                break;
            case '48h':
                const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
                dateFilter = sub => (sub.submittedAt as Timestamp).toDate() > fortyEightHoursAgo;
                break;
            case 'custom':
                if (customDateRange.start && customDateRange.end) {
                    const startDate = new Date(customDateRange.start);
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = new Date(customDateRange.end);
                    endDate.setHours(23, 59, 59, 999);
                    dateFilter = sub => {
                        const subDate = (sub.submittedAt as Timestamp).toDate();
                        return subDate >= startDate && subDate <= endDate;
                    };
                } else {
                    dateFilter = () => true;
                }
                break;
            default: // 'all'
                dateFilter = () => true;
        }

        filteredSubmissions = filteredSubmissions.filter(dateFilter);

        const dataByTimeSlot: { [key: string]: number } = {};
        const timeSlotToDateMap: { [key: string]: Date } = {};
        
        filteredSubmissions.forEach(sub => {
            const date = (sub.submittedAt as Timestamp).toDate();
            let timeSlot: string;

            if (timeFilter === '60m') {
                timeSlot = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (timeFilter === '48h') {
                timeSlot = date.toLocaleString([], { weekday: 'short', hour: 'numeric', hour12: true }).replace(',', '');
            } else {
                timeSlot = date.toLocaleDateString();
            }

            if (!dataByTimeSlot[timeSlot]) {
                 dataByTimeSlot[timeSlot] = 0;
                 timeSlotToDateMap[timeSlot] = date;
            }
            dataByTimeSlot[timeSlot]++;
        });

        const formattedData = Object.keys(dataByTimeSlot).map(timeSlot => ({
            name: timeSlot,
            submissions: dataByTimeSlot[timeSlot],
            date: timeSlotToDateMap[timeSlot],
        })).sort((a, b) => a.date.getTime() - b.date.getTime());

        setChartData(formattedData);
    }, [submissions, timeFilter, customDateRange]);
    
    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
    }
    
    if (!campaign) {
        return <div className="text-center">Campaign not found.</div>;
    }

    const totalSubmissions = submissions.filter(s => s.status === 'Submitted' || s.status === 'Updated').length;
    const totalParticipants = campaign.participantCount || 0;
    const participationRate = totalParticipants > 0 ? ((totalSubmissions / totalParticipants) * 100).toFixed(1) : 0;
    const pendingSubmissions = totalParticipants - totalSubmissions;

    return (
        <div className="space-y-6">
            <Link to="/admin/campaigns">
                <Button variant="ghost" className="mb-4">&larr; Back to Campaigns</Button>
            </Link>
            <h1 className="text-3xl font-bold">Analytics: {campaign.name}</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard title="Total Submissions" value={totalSubmissions} description="Forms submitted by users." />
                <MetricCard title="Pending Submissions" value={pendingSubmissions} description="Users who haven't submitted." />
                <MetricCard title="Participation Rate" value={`${participationRate}%`} description="Overall user engagement." />
            </div>

            <Card>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="text-xl font-semibold">Submission Trends</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant={timeFilter === '60m' ? 'primary' : 'secondary'} size="sm" onClick={() => setTimeFilter('60m')}>Last 60 Mins</Button>
                        <Button variant={timeFilter === '48h' ? 'primary' : 'secondary'} size="sm" onClick={() => setTimeFilter('48h')}>Last 48 Hours</Button>
                        <Button variant={timeFilter === 'all' ? 'primary' : 'secondary'} size="sm" onClick={() => setTimeFilter('all')}>All Time</Button>
                        <Button variant={timeFilter === 'custom' ? 'primary' : 'secondary'} size="sm" onClick={() => setTimeFilter('custom')}>Custom</Button>
                    </div>
                </div>

                {timeFilter === 'custom' && (
                    <div className="flex items-center space-x-2 mb-4 p-4 border rounded-md bg-secondary/50">
                        <Input label="Start Date" type="date" value={customDateRange.start} onChange={e => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))} />
                        <Input label="End Date" type="date" value={customDateRange.end} onChange={e => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))} />
                    </div>
                )}

                <div className="h-80">
                   {chartData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.border} />
                            <XAxis dataKey="name" stroke={chartColors.mutedForeground} tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} interval={Math.ceil(chartData.length / 15)} />
                            <YAxis stroke={chartColors.mutedForeground} tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: chartColors.card,
                                    borderColor: chartColors.border,
                                    color: chartColors.mutedForeground
                                }}
                                labelStyle={{ color: 'rgb(var(--foreground))' }}
                            />
                            <Legend wrapperStyle={{ color: chartColors.mutedForeground, paddingTop: '20px' }} />
                            <Bar dataKey="submissions" fill={chartColors.primary} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                   ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No submission data available for this period.</p>
                    </div>
                   )}
                </div>
            </Card>
        </div>
    );
};

export default CampaignAnalytics;
