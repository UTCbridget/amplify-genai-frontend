import {
    IconCheck,
    IconCopy,
    IconEdit,
    IconRobot,
    IconTrash,
    IconBolt,
    IconDownload,
    IconMail,
    IconUser,
} from '@tabler/icons-react';
import React, {FC, memo, useContext, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'next-i18next';
import {updateConversation} from '@/utils/app/conversation';
import {DataSource, Message} from '@/types/chat';
import HomeContext from '@/pages/api/home/home.context';
import ChatFollowups from './ChatFollowups';
import ChatContentBlock from "@/components/Chat/ChatContentBlocks/ChatContentBlock";
import UserMessageEditor from "@/components/Chat/ChatContentBlocks/UserMessageEditor";
import AssistantMessageEditor from "@/components/Chat/ChatContentBlocks/AssistantMessageEditor";
import {Prompt} from "@/types/prompt";
import {DownloadModal} from "@/components/Download/DownloadModal";
import Loader from "@/components/Loader/Loader";
import {LoadingDialog} from "@/components/Loader/LoadingDialog";
import PromptingStatusDisplay from "@/components/Status/PromptingStatusDisplay";
import ChatSourceBlock from "@/components/Chat/ChatContentBlocks/ChatSourcesBlock";
import DataSourcesBlock from "@/components/Chat/ChatContentBlocks/DataSourcesBlock";
import ChatCodeInterpreterFileBlock from './ChatContentBlocks/ChatCodeInterpreterFilesBlock';import { uploadConversation } from '@/services/remoteConversationService';
import { isRemoteConversation } from '@/utils/app/conversationStorage';
import { downloadDataSourceFile } from '@/utils/app/files';
import { Stars } from './Stars';
import { saveUserRating } from '@/services/groupAssistantService';
// import { ArtifactsBlock } from './ChatContentBlocks/ArtifactsBlock';


export interface Props {
    message: Message;
    messageIndex: number;
    onEdit?: (editedMessage: Message) => void,
    onSend: (message: Message[]) => void,
    onSendPrompt: (prompt: Prompt) => void,
    onChatRewrite: (message: Message, updateIndex: number, requestedRewrite: string, prefix: string, suffix: string, feedback: string) => void,
    handleCustomLinkClick: (message: Message, href: string) => void,
}


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
        state: {selectedConversation, conversations,messageIsStreaming, status, folders, featureFlags},
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
    const [currentRating, setCurrentRating] = useState<number | undefined>(message.data?.rating);
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');

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
            downloadDataSourceFile(dataSource);
            
        } catch (e) {
            console.log(e);
            alert("Error downloading file. Please try again.");
        }
        setIsFileDownloadDatasourceVisible(false);
    }


    const isActionResult = message.data && message.data.actionResult;
    const isAssistant = message.role === 'assistant';

    let msgStyle = 'border-b border-t border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#343541] dark:text-gray-100';
    if(isActionResult){
        msgStyle = 'bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100';
    }
    else if(isAssistant){
        msgStyle = 'bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100';
    }

    const enableTools = !isActionResult;

    const getIcon = () => {
        if (isActionResult) {
            return <IconBolt size={30}/>;
        } else if (isAssistant) {
            return <IconRobot size={30}/>;
        } else {
            return <IconUser size={30}/>;
        }
    }

    const getAtBlock = () => {
        if(!isActionResult &&
            assistantRecipient &&
            assistantRecipient.definition &&
            assistantRecipient.definition.name &&
            assistantRecipient.definition.assistantId) {
            return (<span className="bg-neutral-300 dark:bg-neutral-600 rounded-xl pr-1 pl-1">
                                                        {"@" + assistantRecipient.definition.name + ":"}
                                                    </span>);
        } else if(!isActionResult) {
            return (<span className="bg-neutral-300 dark:bg-neutral-600 rounded-xl pr-1 pl-1">
                                                        @Amplify:
                                                    </span>);
        } else {
           return (<span className="bg-yellow-500 dark:bg-yellow-500 text-black rounded-xl py-1.5 pr-1 pl-1">
                                                        {'\u2713 Action Completed:'}
                                                    </span>);
        }
    }

    const handleRatingSubmit = (r: number) => {
        setCurrentRating(r);
        if (onEdit && selectedConversation) {
            const updatedMessage = { ...message, data: { ...message.data, rating: r } };
            onEdit(updatedMessage);

            saveUserRating(selectedConversation.id, r)
                .then((result) => {
                    if (!result.success) {
                        console.error('Failed to save user rating');
                    } else {
                        setShowFeedbackInput(true);
                    }
                })
                .catch((error) => {
                    console.error('Error saving user rating');
                });
        }
    };

    const handleFeedbackSubmit = () => {
        if (selectedConversation && currentRating !== undefined) {
            saveUserRating(selectedConversation.id, currentRating, feedbackText)
                .then((result) => {
                    if (result.success) {
                        setShowFeedbackInput(false);
                        setFeedbackText('');
                    } else {
                        console.error('Failed to save user feedback');
                    }
                })
                .catch((error) => {
                    console.error('Error saving user feedback');
                });
        } else {
            console.error('No rating available or conversation not selected');
        }
    };

    // @ts-ignore
    return (
        <div
            className={`group md:px-4 ${msgStyle}`}
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
                className="relative m-auto flex p-2 text-base md:max-w-2xl md:gap-6 md:py-2 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                <div className="min-w-[40px] text-right font-bold">
                    {getIcon()}
                </div>

                <div className="prose mt-[-2px] w-full dark:prose-invert">
                    {message.role === 'user' ? (
                        <div className="flex flex-grow">
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
                                                {getAtBlock()} {message.label || message.content}
                                            </div>
                                        </div>
                                        <DataSourcesBlock message={message} handleDownload={handleDownload}/>
                                        {isActionResult && (
                                            <ChatSourceBlock
                                                messageIsStreaming={messageIsStreaming}
                                                message={message}
                                            />
                                        )}
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
                                    className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-col gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                                    {/*<div*/}
                                    {/*    className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">*/}
                                    <div>
                                        {messagedCopied ? (
                                            <IconCheck
                                                size={20}
                                                className="text-green-500 dark:text-green-400"
                                            />
                                        ) : (
                                            <button
                                                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                onClick={copyOnClick}
                                                title="Copy Prompt"
                                            >
                                                <IconCopy size={20}/>
                                            </button>
                                        )}
                                    </div>
                                    {!isActionResult && (
                                    <div>
                                        <button
                                            className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={() => setIsDownloadDialogVisible(true)}
                                            title="Download Prompt"
                                        >
                                            <IconDownload size={20}/>
                                        </button>
                                    </div>)
                                    }
                                    <div>
                                        <button
                                            className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={toggleEditing}
                                            title="Edit Prompt"
                                        >
                                            <IconEdit size={20}/>
                                        </button>
                                    </div>
                                    {!isActionResult && (
                                    <div>
                                        <button
                                            className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={handleDeleteMessage}
                                            title="Delete Prompt"
                                        >
                                            <IconTrash size={20}/>
                                        </button>
                                    </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : ( // Assistant message
                        <div className="flex flex-col w-full" ref={markdownComponentRef}>
                            <div className="flex flex-row w-full">
                                <div className="flex flex-col w-full">
                                    {(selectedConversation?.messages.length === messageIndex + 1) && (
                                        <PromptingStatusDisplay statusHistory={status}/>
                                    )}
                                    {!isEditing && (
                                         <> 
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
                                       
                                        {/* {featureFlags.artifacts && 
                                        <ArtifactsBlock 
                                            message={message}
                                        />} */}

                                        <ChatCodeInterpreterFileBlock
                                            messageIsStreaming={messageIsStreaming}
                                            message={message}
                                        />
                                        <ChatSourceBlock
                                            messageIsStreaming={messageIsStreaming}
                                            message={message}
                                        />
                                        </>
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
                                    className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-col gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                                    {messagedCopied ? (
                                        <IconCheck
                                            size={20}
                                            className="text-green-500 dark:text-green-400"
                                        />
                                    ) : (
                                        <button
                                            className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            onClick={copyOnClick}
                                            title="Copy Response"
                                        >
                                            <IconCopy size={20}/>
                                        </button>
                                    )}
                                    <button
                                        className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        onClick={() => setIsDownloadDialogVisible(true)}
                                        title="Download Response"
                                    >
                                        <IconDownload size={20}/>
                                    </button>
                                    <button
                                        className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        title="Email Response"
                                    >
                                        <a className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                           href={`mailto:?body=${encodeURIComponent(messageContent)}`}>
                                            <IconMail size={20}/>
                                        </a>
                                    </button>
                                    <button
                                        className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        onClick={toggleEditing}
                                        title="Edit Response"
                                    >
                                        <IconEdit size={20}/>
                                    </button>


                                </div>
                            </div>
                            {(messageIsStreaming || isEditing) ? null : (
                                <ChatFollowups promptSelected={(p) => {
                                    onSendPrompt(p)
                                }}/>
                            )}
                            {message.data?.state?.currentAssistantId && message.data?.state?.currentAssistantId.startsWith('astgp') && !messageIsStreaming && !isEditing && (
                                <>
                                    <Stars
                                        starRating={message.data?.rating || 0}
                                        setStars={handleRatingSubmit}
                                    />
                                    {showFeedbackInput && (
                                        <div className="mt-2">
                                            <textarea
                                                className="w-full p-2 border rounded bg-white text-gray-800 dark:bg-gray-700 dark:text-white"
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder="Please provide any additional feedback"
                                            />
                                            <button
                                                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                                                onClick={() => {
                                                    handleFeedbackSubmit();
                                                    setShowFeedbackInput(false);
                                                }}
                                            >
                                                Submit Feedback
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
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
