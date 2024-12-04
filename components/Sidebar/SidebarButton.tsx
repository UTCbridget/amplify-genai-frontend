import { FC } from 'react';

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <button
      className="settings-menu flex w-full cursor-pointer select-none items-center justify-between gap-3 py-3 px-3 text-[14px] leading-3 dark:text-white dark:hover:text-yellow-500 transition-colors duration-200 hover-neutral-200 dark:hover:bg-gray-500/10"
      onClick={onClick}
    >
      <span>{text}</span>
      <svg viewBox="0 0 640 512" className="w-6"><path fill="#fdb736" d="M489.6 256c0 41.6-32 73.6-73.6 73.6s-73.6-32-73.6-73.6s32-73.6 73.6-73.6s73.6 35.2 73.6 73.6zM246.4 336a73.6 73.6 0 1 0 0 147.2 73.6 73.6 0 1 0 0-147.2zM243.2 35.2a73.6 73.6 0 1 0 0 147.2 73.6 73.6 0 1 0 0-147.2z"></path></svg>
    </button>
  );
};
