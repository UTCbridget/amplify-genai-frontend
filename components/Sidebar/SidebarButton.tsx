import { FC } from 'react';

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <button
      className="sidebar-button flex w-full cursor-pointer select-none items-center gap-3  py-3 px-3 text-[14px] leading-3 dark:text-white transition-colors duration-200 hover:bg-neutral-200 dark:hover:bg-blue-500 dark:hover:text-yellow-500" 
      onClick={onClick}
    >
      <div>{icon}</div>
      <span>{text}</span>
    </button>
  );
};
