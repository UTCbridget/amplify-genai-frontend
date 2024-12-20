import {
    IconCheck,
    IconCopy,
    IconEdit,
    IconRobot,
    IconTrash,
    IconWriting,
    IconDownload,
    IconMail,
    IconFileCheck,
    IconUser,
} from '@tabler/icons-react';
import {FiCommand} from "react-icons/fi";
import styled, {keyframes} from 'styled-components';
import React, {FC, memo, useContext, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'next-i18next';
import {conversationWithUncompressedMessages, updateConversation} from '@/utils/app/conversation';
import {DataSource, Message} from '@/types/chat';
import {useChatService} from "@/hooks/useChatService";
import HomeContext from '@/pages/api/home/home.context';
import ChatFollowups from './ChatFollowups';
import {VariableModal} from "@/components/Chat/VariableModal";
import ChatContentBlock from "@/components/Chat/ChatContentBlocks/ChatContentBlock";
import UserMessageEditor from "@/components/Chat/ChatContentBlocks/UserMessageEditor";
import AssistantMessageEditor from "@/components/Chat/ChatContentBlocks/AssistantMessageEditor";
import {Style} from "css-to-react-native";
import {Prompt} from "@/types/prompt";
/*import {Stars} from "@/components/Chat/Stars";*/
import {DownloadModal} from "@/components/Download/DownloadModal";
import Loader from "@/components/Loader/Loader";
import {getFileDownloadUrl} from "@/services/fileService"
import {FileList} from "@/components/Chat/FileList";
import {LoadingDialog} from "@/components/Loader/LoadingDialog";
import StatusDisplay from "@/components/Chatbar/components/StatusDisplay";
import PromptingStatusDisplay from "@/components/Status/PromptingStatusDisplay";
import ChatSourceBlock from "@/components/Chat/ChatContentBlocks/ChatSourcesBlock";
import DataSourcesBlock from "@/components/Chat/ChatContentBlocks/DataSourcesBlock";
import { uploadConversation } from '@/services/remoteConversationService';
import { isRemoteConversation } from '@/utils/app/conversationStorage';


export interface Props {
    message: Message;
    messageIndex: number;
    onEdit?: (editedMessage: Message) => void,
    onSend: (message: Message[]) => void,
    onSendPrompt: (prompt: Prompt) => void,
    onChatRewrite: (message: Message, updateIndex: number, requestedRewrite: string, prefix: string, suffix: string, feedback: string) => void,
    handleCustomLinkClick: (message: Message, href: string) => void,
}

const animate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(720deg);
  }
`;

const LoadingIcon = styled(FiCommand)`
  color: lightgray;
  font-size: 1rem;
  animation: ${animate} 2s infinite;
`;

export const ChatMessage: FC<Props> = memo(({
                                                message,
                                                messageIndex,
                                                onEdit,
                                                onSend,
                                                onSendPrompt,
                                                handleCustomLinkClick,
                                                onChatRewrite
                                            }) => {
    const {t} = useTranslation('chat');

    const {
        state: {selectedConversation, conversations,messageIsStreaming, status, folders},
        dispatch: homeDispatch,
        handleAddMessages: handleAddMessages
    } = useContext(HomeContext);

    const conversationsRef = useRef(conversations);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const foldersRef = useRef(folders);

    useEffect(() => {
        foldersRef.current = folders;
    }, [folders]);



    const markdownComponentRef = useRef<HTMLDivElement>(null);

    const [isDownloadDialogVisible, setIsDownloadDialogVisible] = useState<boolean>(false);
    const [isFileDownloadDatasourceVisible, setIsFileDownloadDatasourceVisible] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);
    const [editSelection, setEditSelection] = useState<string>("");
    const divRef = useRef<HTMLDivElement>(null);

    const assistantRecipient = (message.role === "user" && message.data && message.data.assistant) ?
        message.data.assistant : null;


    const toggleEditing = () => {
        setIsEditing(!isEditing);
    };

    const handleEditMessage = () => {

        if (message.content != messageContent) {
            if (selectedConversation && onEdit) {
                onEdit({...message, content: messageContent});
            }
        }
        setIsEditing(false);
    };

    const handleDeleteMessage = () => {
        if (!selectedConversation) return;

        const {messages} = selectedConversation;
        const findIndex = messages.findIndex((elm:Message) => elm === message);

        if (findIndex < 0) return;

        // Find the index of the next 'user' message after findIndex
        let nextUserIndex = findIndex + 1;
        for (let i = findIndex + 1; i < messages.length; i++) {
            nextUserIndex = i;
            if (messages[i].role === 'user') {
                break;
            }
        }

        if (nextUserIndex === messages.length - 1) {
            nextUserIndex = messages.length;
        }

        let deleteCount = nextUserIndex - findIndex;
        console.log("Find Index: " + findIndex + " Next User Index: " + nextUserIndex
            + " Messages Length: " + messages.length + " Delete Count: " + (nextUserIndex - findIndex));

        if (
            findIndex < messages.length - 1 &&
            messages[findIndex + 1].role === 'assistant' &&
            deleteCount > 0
        ) {
            messages.splice(findIndex, deleteCount);
        } else {
            messages.splice(findIndex, 1);
        }
        const updatedConversation = {
            ...selectedConversation,
            messages,
        };

        const {single, all} = updateConversation(
            updatedConversation,
            conversationsRef.current,
        );
        homeDispatch({ field: 'selectedConversation', value: updatedConversation });
        if (isRemoteConversation(updatedConversation)) uploadConversation(updatedConversation, foldersRef.current);
    };

    const copyOnClick = () => {
        if (!navigator.clipboard) return;

        navigator.clipboard.writeText(message.content).then(() => {
            setMessageCopied(true);
            setTimeout(() => {
                setMessageCopied(false);
            }, 2000);
        });
    };


    // needed to avoid editing bug when switching between conversations
    useEffect(() => {
        setMessageContent(message.content);
    }, [message.content]);


    const handleDownload = async (dataSource: DataSource) => {
        //alert("Downloading " + dataSource.name + " from " + dataSource.id);
        try {
            setIsFileDownloadDatasourceVisible(true);
            const response = await getFileDownloadUrl(dataSource.id);
            setIsFileDownloadDatasourceVisible(false);
            window.open(response.downloadUrl, "_blank");
        } catch (e) {
            setIsFileDownloadDatasourceVisible(false);
            console.log(e);
            alert("Error downloading file. Please try again.");
        }
    }

    // @ts-ignore
    return (
        <div
            className={`assistant-wrapper group md:px-4 ${message.role === 'assistant'
                ? 'border-b border-black/10 bg-gray-50 text-blue-500 dark:border-yellow-500 dark:bg-blue-400/5 dark:text-white'
                : 'border-b border-black/10 bg-white text-blue-500 dark:border-white/10 dark:bg-blue-400/5 dark:text-white'
            }`}
            style={{overflowWrap: 'anywhere'}}
        >
            {isFileDownloadDatasourceVisible && (
                <LoadingDialog open={true} message={"Preparing to download..."}/>
            )}

            {isDownloadDialogVisible && (
                <DownloadModal
                    includeConversations={false}
                    includePrompts={false}
                    includeFolders={false}
                    showHeaders={false}
                    showInclude={false}
                    selectedMessages={[message]}
                    selectedConversations={selectedConversation ? [selectedConversation] : []}
                    onCancel={() => {
                        setIsDownloadDialogVisible(false);
                    }}
                    onDownloadReady={function (url: string): void {

                    }}/>
            )}

            <div
                className="chattutc-message-area relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-3xl lg:px-0 xl:max-w-4xl">
                <div className="min-w-[40px] text-right font-bold">
                    {message.role === 'assistant' ? (
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
                    ) : (
                        <div className="rounded-full w-12 h-12 bg-blue-500 p-2 border border-blue-500 dark:border-yellow-500">
                        <IconUser size={30} className="dark:text-white"/>
                        </div>
                    )}
                </div>

                <div className="prose mt-[-2px] w-full dark:prose-invert">
                    {message.role === 'user' ? (
                        <div className="flex flex-grow flex-col">
                            {isEditing ? (

                                <UserMessageEditor
                                    messageIsStreaming={messageIsStreaming}
                                    messageIndex={messageIndex}
                                    message={message}
                                    handleEditMessage={handleEditMessage}
                                    selectedConversation={selectedConversation}
                                    setIsEditing={setIsEditing}
                                    isEditing={isEditing}
                                    messageContent={messageContent}
                                    setMessageContent={setMessageContent}/>

                            ) : (
                                <div className="flex flex-grow flex-col">
                                    <div className="flex flex-col">
                                        <div className="flex flex-row">
                                            <div className="prose whitespace-pre-wrap dark:prose-invert flex-1">
                                                {assistantRecipient &&
                                                 assistantRecipient.definition &&
                                                 assistantRecipient.definition.name &&
                                                 assistantRecipient.definition.assistantId ?
                                                    <span className="bg-blue-500 dark:bg-yellow-500  pr-1 pl-1 mr-3 hidden">
                                                    </span>
                                                    :
                                                    <span className="bg-blue-500 dark:bg-yellow-500  pr-1 pl-1 mr-3 hidden">
                                                    </span>
                                                } {message.label || message.content}
                                            </div>
                                        </div>
                                        <DataSourcesBlock message={message} handleDownload={handleDownload}/>
                                    </div>
                                    <div className="flex flex-row">
                                        {(isEditing || messageIsStreaming) ? null : (

                                            <ChatFollowups promptSelected={(p) => {
                                                onSendPrompt(p)
                                            }}/>

                                        )}
                                    </div>
                                </div>
                            )}

                            {!isEditing && (
                                <div
                                    className="user-chat-actions md:-mr-8 ml-1 md:ml-0 flex flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                                    {/*<div*/}
                                    {/*    className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">*/}
                                    <div>
                                        {messagedCopied ? (
                                            <IconCheck
                                                size={20}
                                                className="text-green-500 dark:text-green-400 dark:hover:text-green-600"
                                            />
                                        ) : (
                                            <button
                                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                onClick={copyOnClick}
                                                title="Copy Prompt"
                                            >
                                                <IconCopy size={20} className="dark:hover:text-yellow-500" />
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <button
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={() => setIsDownloadDialogVisible(true)}
                                            title="Download Prompt"
                                        >
                                            <IconDownload size={20}/>
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={toggleEditing}
                                            title="Edit Prompt"
                                        >
                                            <IconEdit size={20}/>
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={handleDeleteMessage}
                                            title="Delete Prompt"
                                        >
                                            <IconTrash size={20}/>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : ( // Assistant message
                        <div className="flex flex-col w-full" ref={markdownComponentRef}>
                            <div className="chattutc-message-wrapper flex flex-col w-full">
                                <div className="flex flex-col w-full">
                                    {(selectedConversation?.messages.length === messageIndex + 1) && (
                                        <PromptingStatusDisplay statusHistory={status}/>
                                    )}
                                    {!isEditing && (
                                        <div className="flex flex-grow"
                                             ref={divRef}
                                        >
                                            <ChatContentBlock
                                                messageIsStreaming={messageIsStreaming}
                                                messageIndex={messageIndex}
                                                message={message}
                                                selectedConversation={selectedConversation}
                                                handleCustomLinkClick={handleCustomLinkClick}
                                            />
                                        </div>
                                    )}
                                    {!isEditing && (
                                        <ChatSourceBlock
                                            messageIsStreaming={messageIsStreaming}
                                            messageIndex={messageIndex}
                                            message={message}
                                            selectedConversation={selectedConversation}
                                            handleCustomLinkClick={handleCustomLinkClick}
                                        />
                                    )}
                                    {isEditing && (
                                        <AssistantMessageEditor
                                            messageIsStreaming={messageIsStreaming}
                                            messageIndex={messageIndex}
                                            message={message}
                                            handleEditMessage={handleEditMessage}
                                            selectedConversation={selectedConversation}
                                            setIsEditing={setIsEditing}
                                            isEditing={isEditing}
                                            messageContent={messageContent}
                                            setMessageContent={setMessageContent}/>
                                    )}
                                </div>

                                <div
                                    className="chattutc-chat-actions md:-mr-8 ml-1 md:ml-0 flex flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                                    {messagedCopied ? (
                                        <IconCheck
                                            size={20}
                                            className="text-green-500 dark:text-green-400"
                                        />
                                    ) : (
                                        <div>
                                            <button
                                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                onClick={copyOnClick}
                                                title="Copy Response"
                                            >
                                                <IconCopy size={20}/>
                                            </button>
                                        </div>
                                    )}
                                    <div>
                                        <button
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={() => setIsDownloadDialogVisible(true)}
                                            title="Download Response"
                                        >
                                            <IconDownload size={20}/>
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            title="Email Response"
                                        >
                                            <a className=" text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            href={`mailto:?body=${encodeURIComponent(messageContent)}`}>
                                                <IconMail size={20}/>
                                            </a>
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={toggleEditing}
                                            title="Edit Response"
                                        >
                                            <IconEdit size={20}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {(messageIsStreaming || isEditing) ? null : (
                                <ChatFollowups promptSelected={(p) => {
                                    onSendPrompt(p)
                                }}/>
                            )}
                            {/*{(messageIsStreaming || isEditing) ? null : (
                                <Stars starRating={message.data && message.data.rating || 0} setStars={(r) => {
                                    if (onEdit) {
                                        onEdit({...message, data: {...message.data, rating: r}});
                                    }
                                }}/>
                            )}*/}
                            {(messageIsStreaming && messageIndex == (selectedConversation?.messages.length ?? 0) - 1) ?
                                // <LoadingIcon />
                                <Loader type="ping" size="48"/>
                                : null}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
});
ChatMessage.displayName = 'ChatMessage';
