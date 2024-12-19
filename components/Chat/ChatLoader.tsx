import { IconRobot } from '@tabler/icons-react';
import { FC } from 'react';

interface Props { }

export const ChatLoader: FC<Props> = () => {
  return (
    <div
      className="group border-b border-black/10 bg-blue-300 text-blue-800 dark:border-gray-900/50 dark:bg-blue-300/10"
      style={{ overflowWrap: 'anywhere' }}
    >
      <div className="m-auto flex gap-4 p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
        <div className="min-w-[40px] items-end">
          <div className="rounded-full w-12 h-12 bg-blue-500 p-2 border border-blue-500 dark:border-yellow-500">
            <svg viewBox="0 0 87 75" className="power-c-chatt-icon">
              <g>
                <path fill="#FFFFFF" d="M77.5,32.8L85,0H40c-8.5,0-14.9,1.1-19.7,3.4C14.2,6.3,10,11.5,8.5,18.3L0.7,53c-1.4,5.9-0.6,10.6,2.4,14.3
                                      c3.8,4.9,10.6,6.9,22.6,6.9h42.5l5.9-25.7H39.2l3.7-15.8L77.5,32.8L77.5,32.8z"/>
                <path fill="#112E50" d="M34.4,52.3l34.9-0.2l-4,18.1l-39.5,0.2c-10.7,0.1-16.6-1.6-19.6-5.4c-2.2-2.8-2.7-6.3-1.8-11l7.8-34.7
                                      c1.3-5.7,4.5-9.8,9.6-12.4C26.1,5,31.9,4,39.9,3.9l40.2-0.2l-5.7,25l-27,0.2l1.7-7.1l-7.9,0L34.4,52.3z"/>
                <path fill="#FDB733" d="M77.3,6.6l-4.5,19.8H51.2l1.7-7.1H39.6L31.4,55h34.9l-3,12.8H25.9c-14,0-21.1-2.7-18.7-13.3l8-34.7
                                      C17.5,9.5,26.5,6.5,40.4,6.5L77.3,6.6L77.3,6.6z"/>
              </g>
            </svg>
          </div>
        </div>
        <span className="animate-pulse cursor-default mt-1">▍</span>
      </div>
    </div>
  );
};
