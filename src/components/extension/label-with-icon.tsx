import React from 'react';

interface LabelWithIconProps {
    label: string;
    className?: string;
    labelClassName?: string;
}

// 原来这里会按 isActivated 显示开锁/上锁图标，付费功能去掉后一律显示纯文字。
const LabelWithIcon: React.FC<LabelWithIconProps> = ({ label, className = '', labelClassName = '' }) => {
    return (
        <div className={`flex gap-x-2 items-center ${className}`}>
            <h3 className={`text-sm font-semibold ${labelClassName}`}>{label}</h3>
        </div>
    );
};

export default LabelWithIcon;
