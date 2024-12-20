import { IconFileExport, IconSettings, IconMail, IconCloud } from '@tabler/icons-react';
import { useContext, useState } from 'react';


import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { Import } from '../../Settings/Import';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import {AccountDialog} from "@/components/Settings/AccountDialog";
import { StorageDialog } from '@/components/Settings/StorageDialog';


export const ChatbarSettings = () => {
    const { t } = useTranslation('sidebar');
    const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);
    const [isAccountDialogVisible, setIsAccountDialogVisible] = useState<boolean>(false);
    const [isStorageDialogVisible, setIsStorageDialogVisible] = useState<boolean>(false);


    const {
        state: {
            featureFlags
        },
        dispatch: homeDispatch,
    } = useContext(HomeContext);

    const {
        handleClearConversations,
        handleImportConversations,
        handleExportData,
    } = useContext(ChatbarContext);

    return (
        <div className="flex flex-col items-center space-y-0 m-0 p-0 border-t dark:border-white/20 pt-1 text-sm">
            {/*{conversations.length > 0 ? (*/}
            {/*    <ClearConversations onClearConversations={handleClearConversations}/>*/}
            {/*) : null}*/}

            {/*<SidebarButton
                text={t('Manage Accounts')}
                icon={<IconSettings size={18} />}
                onClick={() => {
                    //statsService.setThemeEvent();
                    setIsAccountDialogVisible(true)
                }}
            />*/}

            <Import onImport={handleImportConversations} />

            {/*<ImportFromUrl onImport={handleImportConversations}/>*/}


            <SidebarButton
                text={t('Export Conversations')}
                icon={<IconFileExport size={18} />}
                onClick={() => handleExportData()}
            />

            {featureFlags.storeCloudConversations && <SidebarButton
                text={t('Conversation Storage')}
                icon={<IconCloud size={18} />}
                onClick={() => {
                    setIsStorageDialogVisible(true);
                }}
            />}

            <SidebarButton
                text={t('Theme')}
                icon={<IconSettings size={18} />}
                onClick={() => {
                    //statsService.setThemeEvent();
                    setIsSettingDialog(true)
                }}
            />

            <SidebarButton
                text={t('Have questions? Email us.')}
                icon={<IconMail size={18} />}
                onClick={() => window.location.href = 'mailto:ithelp@utc.edu?subject=I have a question(s) about ChattUTC.'}
            />



            <SettingDialog
                open={isSettingDialogOpen}
                onClose={() => {
                    setIsSettingDialog(false);
                }}
            />

            <AccountDialog
                open={isAccountDialogVisible}
                onClose={() => {
                    setIsAccountDialogVisible(false);
                }}
            />
            { featureFlags.storeCloudConversations && <StorageDialog
                open={isStorageDialogVisible}
                onClose={() => {
                    setIsStorageDialogVisible(false);
                }}
            />}

        </div>
    );
};
