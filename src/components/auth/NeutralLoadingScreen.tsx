import React from 'react';
import { LogoMark } from '../common/LogoMark.tsx';

export const NeutralLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#F6F7F9] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-[14px] bg-[#D92D50] text-white flex items-center justify-center shadow-xs animate-pulse mb-3">
          <LogoMark size={24} />
        </div>
        <div className="w-5 h-5 border-2 border-[#D92D50] border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    </div>
  );
};
