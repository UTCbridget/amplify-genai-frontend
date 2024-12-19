import { IconFolderPlus, IconMistOff, IconPlus } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Search from '../Search';
import { KebabMenu } from './components/KebabMenu';
import { SortType } from '@/types/folder';


interface Props<T> {
  isOpen: boolean;
  addItemButtonTitle: string;
  side: 'left' | 'right';
  items: T[];
  itemComponent: ReactNode;
  folderComponent: ReactNode;
  footerComponent?: ReactNode;
  searchTerm: string;
  handleSearchTerm: (searchTerm: string) => void;
  toggleOpen: () => void;
  handleCreateItem: () => void;
  handleCreateFolder: () => void;
  handleDrop: (e: any) => void;
  handleCreateAssistantItem: () => void;
  setFolderSort: (s: SortType) => void;
}

const Sidebar = <T,>({
  isOpen,
  addItemButtonTitle,
  side,
  items,
  itemComponent,
  folderComponent,
  footerComponent,
  searchTerm,
  handleSearchTerm,
  toggleOpen,
  handleCreateItem,
  handleCreateFolder,
  handleDrop,
  handleCreateAssistantItem,
  setFolderSort,
}: Props<T>) => {

  const { t } = useTranslation('promptbar');

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = '#051228';
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  const addItemButton = (width: string) => ( <button className={`text-sidebar flex ${width} flex-shrink-0 justify-between cursor-pointer select-none items-center gap-3 border dark:border-white/20 p-3 dark:text-white dark:hover:text-yellow-500 transition-colors duration-200 bg-transparent hover:bg-blue-500`}
                              onClick={() => {
                                handleCreateItem();
                                handleSearchTerm('');
                              }}
                              >
                                {addItemButtonTitle}
                                <svg viewBox="0 0 640 512" className="w-6"><path fill="#fdb736" d="M489.6 256c0 41.6-32 73.6-73.6 73.6s-73.6-32-73.6-73.6s32-73.6 73.6-73.6s73.6 35.2 73.6 73.6zM246.4 336a73.6 73.6 0 1 0 0 147.2 73.6 73.6 0 1 0 0-147.2zM243.2 35.2a73.6 73.6 0 1 0 0 147.2 73.6 73.6 0 1 0 0-147.2z"></path></svg>
                              </button>);

  const addButtonForSide = (side: string) => {
    if (side === 'left') return addItemButton("w-[205px]")

    const addAssistantButton = (
      <button
        className="text-sidebar flex w-[205px] flex-shrink-0 cursor-pointer select-none items-center justify-between gap-3 border dark:border-white/20 p-3 dark:text-white dark:hover:text-yellow-500 transition-colors duration-200 bg-transparent hover:bg-blue-500"
        onClick={() => {
          handleCreateAssistantItem();
          handleSearchTerm('');
        }}
      >
       
        {"Assistant"}
        <svg viewBox="0 0 640 512" className="w-6" ><path fill="#fdb736" d="M489.6 256c0 41.6-32 73.6-73.6 73.6s-73.6-32-73.6-73.6s32-73.6 73.6-73.6s73.6 35.2 73.6 73.6zM246.4 336a73.6 73.6 0 1 0 0 147.2 73.6 73.6 0 1 0 0-147.2zM243.2 35.2a73.6 73.6 0 1 0 0 147.2 73.6 73.6 0 1 0 0-147.2z"></path></svg>
      </button>
    );

    return addAssistantButton
    
  }

  return (
    <div className={`border-t dark:border-white/20 overflow-x-hidden h-full`}>
      <div
        className={`fixed top-0 ${side}-0 z-40 flex h-full w-[270px] flex-none flex-col space-y-2 bg-transparent p-2 text-[14px] transition-all sm:relative sm:top-0 xs:dark:bg-blue-500`}
      >
        <div className="flex items-center">
          {addButtonForSide(side)}
          <button
            className="folder-button ml-2 flex flex-shrink-0 cursor-pointer items-center gap-3 border dark:border-white/20 p-3 text-sm dark:text-white transition-colors duration-200 hover:bg-blue-500 dark:hover:text-yellow-500"
            onClick={handleCreateFolder}
            title="Create Folder"
          >
            <IconFolderPlus size={16} />
          </button>
        </div>
        {side === 'right' && addItemButton('')}
        <Search
          placeholder={t('Search...') || ''}
          searchTerm={searchTerm}
          onSearch={handleSearchTerm}
        />
        <div className="conversation-prompt-wrapper">
        <KebabMenu
        label={side === 'left' ? "Conversations": "Prompts"} 
        items={items}
        handleSearchTerm={handleSearchTerm}
        setFolderSort={setFolderSort}
        />
        <div className="relative flex-grow overflow-y-auto w-[268px]">
          {items?.length > 0 && (
            <div className="flex border-b dark:border-white/20 pb-2 bg-transparent">
              {folderComponent}
            </div>
          )}

          {items?.length > 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={allowDrop}
              onDragEnter={highlightDrop}
              onDragLeave={removeHighlight}
            >
              {itemComponent}
            </div>
          ) : (
            <div className="mt-8 select-none text-center dark:text-white opacity-50">
              <IconMistOff className="mx-auto mb-3" />
              <span className="text-[14px] leading-normal">
                {t('No data.')}
              </span>
            </div>
          )}
           
        </div>
        </div>

        {footerComponent}
      </div>
    </div>
  );
};

export default Sidebar;

