import React from 'react';
import { Card } from '../../components/ui';

export const StatCard = ({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) => (
    <Card className="text-center">
        <div className="text-primary-400 mx-auto w-8 h-8 mb-2">{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </Card>
);
