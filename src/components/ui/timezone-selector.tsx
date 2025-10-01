'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TIMEZONES, TimezoneKey } from '@/lib/utils/timezone';
import { useTimezone } from '@/contexts/TimezoneContext';
import { Clock } from 'lucide-react';

interface TimezoneSelectorProps {
  showLabel?: boolean;
  className?: string;
}

export function TimezoneSelector({ showLabel = true, className = '' }: TimezoneSelectorProps) {
  const { timezone, setTimezone } = useTimezone();

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
  };

  return (
    <div className={className}>
      {showLabel && (
        <Label htmlFor="timezone" className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Zone
        </Label>
      )}
      <Select value={timezone} onValueChange={handleTimezoneChange}>
        <SelectTrigger id="timezone" className="border-gray-200 bg-white">
          <SelectValue placeholder="Select your timezone" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 max-h-80">
          {Object.entries(TIMEZONES).map(([key, label]) => (
            <SelectItem
              key={key}
              value={key}
              className="bg-white hover:bg-gray-50"
            >
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500 mt-1">
        All dates and times will be displayed in your selected timezone
      </p>
    </div>
  );
}