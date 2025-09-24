// Task Origin Badge Component
import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Business, AccountTree } from '@mui/icons-material';
import { TaskOrigin } from '../utils/taskOriginUtils';

interface TaskOriginBadgeProps {
  origin: TaskOrigin;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  showTooltip?: boolean;
}

const TaskOriginBadge: React.FC<TaskOriginBadgeProps> = ({ 
  origin, 
  size = 'small', 
  variant = 'outlined',
  showTooltip = true 
}) => {
  const getIcon = () => {
    switch (origin.iconType) {
      case 'Business':
        return <Business fontSize="small" />;
      case 'AccountTree':
        return <AccountTree fontSize="small" />;
      default:
        return <AccountTree fontSize="small" />;
    }
  };

  const badge = (
    <Chip
      icon={getIcon()}
      label={origin.label}
      color={origin.color}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 500,
        '& .MuiChip-icon': {
          fontSize: '16px'
        }
      }}
    />
  );

  if (showTooltip) {
    return (
      <Tooltip title={origin.description} arrow>
        {badge}
      </Tooltip>
    );
  }

  return badge;
};

export default TaskOriginBadge;