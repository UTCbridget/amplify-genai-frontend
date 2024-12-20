import React, {useContext, useEffect, useMemo, useState} from 'react';
import {IconDownload} from "@tabler/icons-react";
import {
    MantineReactTable,
    useMantineReactTable,
    type MRT_ColumnDef, MRT_SortingState, MRT_ColumnFiltersState, MRT_Cell, MRT_TableInstance,
} from 'mantine-react-table';
import {MantineProvider} from "@mantine/core";
import HomeContext from "@/pages/api/home/home.context";
import {FileQuery, FileRecord, PageKey, queryUserFiles, setTags, getFileDownloadUrl} from "@/services/fileService";
import {TagsList} from "@/components/Chat/TagsList";
import {LoadingDialog} from "@/components/Loader/LoadingDialog";


type MimeTypeMapping = {
    [mimeType: string]: string;
};

const mimeTypeToCommonName: MimeTypeMapping = {
    "text/vtt": "Voice Transcript",
    "application/vnd.ms-excel": "Excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
    "application/vnd.ms-powerpoint": "PowerPoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
    "application/msword": "Word",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
    "text/plain": "Text",
    "application/pdf": "PDF",
    "application/rtf": "Rich Text Format",
    "application/vnd.oasis.opendocument.text": "OpenDocument Text",
    "application/vnd.oasis.opendocument.spreadsheet": "OpenDocument Spreadsheet",
    "application/vnd.oasis.opendocument.presentation": "OpenDocument Presentation",
    "text/csv": "CSV",
    "application/vnd.google-apps.document": "Google Docs",
    "application/vnd.google-apps.spreadsheet": "Google Sheets",
    "application/vnd.google-apps.presentation": "Google Slides",
    "text/html": "HTML",
    "application/xhtml+xml": "XHTML",
    "application/xml": "XML",
    "application/json": "JSON",
    "application/x-latex": "LaTeX",
    "application/vnd.ms-project": "Microsoft Project",
    "text/markdown": "Markdown",
    "application/vnd.ms-outlook": "Outlook Email",
    "application/x-tex": "TeX",
    "text/x-vcard": "vCard",
    "application/x-vnd.ls-xpix": "Lotus Spreadsheet",
    "application/vnd.visio": "Visio",
    "application/x-mspublisher": "Publisher",
    "text/tab-separated-values": "Tab Separated Values",
    "application/x-mswrite": "Write",
    "application/vnd.ms-works": "Microsoft Works",
};


const DataSourcesTable = () => {

    const {
        state: {lightMode},
    } = useContext(HomeContext);

    const [data, setData] = useState<FileRecord[]>(
        []
    );

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 100, //customize the default page size
    });

    const [lastPageIndex, setLastPageIndex] = useState(0);

    const [pageKeys, setPageKeys] = useState<PageKey[]>([]);
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(
        [],
    );
    const [previousColumnFilters, setPreviousColumnFilters] = useState<MRT_ColumnFiltersState>(
        [],
    );
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<MRT_SortingState>([]);
    const [currentMaxItems, setCurrentMaxItems] = useState(100);
    const [currentMaxPageIndex, setCurrentMaxPageIndex] = useState(0);
    const [prevSorting, setPrevSorting] = useState<MRT_SortingState>([]);
    const [isDownloading, setIsDownloading] = useState(false);

    const getTypeFromCommonName = (commonName: string) => {
        const foundType = Object.entries(mimeTypeToCommonName)
            .find(([key, value]) => value === commonName)?.[0];
        return foundType ? foundType : commonName;
    }

    //if you want to avoid useEffect, look at the React Query example instead
    useEffect(() => {
        const fetchData = async () => {
            if (!data.length) {
                setIsLoading(true);
            } else {
                setIsRefetching(true);
            }

            const fetchFiles = async () => {
                try {

                    const globalFilterQuery = globalFilter ? globalFilter : null;
                    const sortStrategy = sorting;

                    if (globalFilterQuery) {
                        setPageKeys([]); //reset page keys if global filter is set
                        setLastPageIndex(0);
                    }

                    if (sorting !== prevSorting) {
                        setPageKeys([]); //reset page keys if sorting changes
                        setLastPageIndex(0);
                        setPrevSorting(sorting);
                    }

                    if (columnFilters !== previousColumnFilters) {
                        setPageKeys([]); //reset page keys if column filters change
                        setLastPageIndex(0);
                        setPreviousColumnFilters(columnFilters);
                    }

                    let sortIndex = 'createdAt'
                    let desc = false;
                    if (sortStrategy.length > 0) {
                        const sort = sortStrategy[0];

                        if (sort.id === 'commonType') {
                            sortIndex = 'type';
                        } else {
                            sortIndex = sort.id;
                        }
                        desc = sort.desc;
                    }

                    const pageKeyIndex = pagination.pageIndex - 1;
                    const pageKey = pageKeyIndex >= 0 ? pageKeys[pageKeyIndex] : null;
                    const forwardScan =
                        ((lastPageIndex < pagination.pageIndex) || !pageKey) ? desc : !desc;

                    setLastPageIndex(pagination.pageIndex);

                    const query: FileQuery = {
                        pageSize: pagination.pageSize,
                        sortIndex,
                        forwardScan
                    };
                    if (pageKey) {
                        query.pageKey = pageKey;
                    }
                    if (globalFilterQuery) {
                        query.namePrefix = globalFilterQuery;
                    }

                    if (columnFilters.length > 0) {
                        for (const filter of columnFilters) {
                            if (filter.id === 'name') {
                                query.namePrefix = "" + filter.value;
                            } else if (filter.id === 'tags') {
                                query.tags = ("" + filter.value)
                                    .split(',')
                                    .map((tag: string) => tag.trim());
                            } else if (filter.id === 'commonType') {
                                const mimeType = getTypeFromCommonName("" + filter.value);
                                query.typePrefix = mimeType;
                            }
                        }
                    }

                    const result = await queryUserFiles(
                        query, null);

                    if (!result.success) {
                        setIsError(true);
                    }

                    const updatedWithCommonNames = result.data.items.map((file: any) => {
                        const commonName = mimeTypeToCommonName[file.type];
                        return {
                            ...file,
                            commonType: commonName || (file.type && file.type.slice(0, 15)) || 'Unknown',
                        };
                    });

                    if ((pageKeyIndex >= pageKeys.length - 1 || pageKeys.length === 0) && result.data.pageKey) {
                        setPageKeys([...pageKeys, result.data.pageKey]);
                    }

                    setData(updatedWithCommonNames);

                    const additional = result.data.items.length === pagination.pageSize ?
                        pagination.pageSize - 1 : 0;

                    const total = pagination.pageIndex * pagination.pageSize
                        + result.data.items.length
                        + additional;

                    if (pageKeyIndex >= currentMaxPageIndex) {
                        setCurrentMaxPageIndex(pageKeyIndex);
                    }

                    if (total > currentMaxItems && pageKeyIndex >= currentMaxPageIndex) {
                        setCurrentMaxItems(total);
                    }

                    if (total >= currentMaxItems) {
                        setRowCount(total);
                    }


                } catch (error) {
                    setIsError(true);
                    console.error(error);
                    return;
                }
                setIsError(false);
                setIsLoading(false);
                setIsRefetching(false);
            }

            fetchFiles();

        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        columnFilters, //refetch when column filters change
        globalFilter, //refetch when global filter changes
        pagination.pageIndex, //refetch when page index changes
        pagination.pageSize, //refetch when page size changes
        sorting, //refetch when sorting changes
    ]);


    function formatIsoString(isoString: string) {
        const options = {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        };
        const date = new Date(isoString);

        // @ts-ignore
        return date.toLocaleString('en-US', options).toLowerCase();
    }

    const downloadFile = async (id: string) => {

        setIsDownloading(true);
        try {
            // /assistant/files/download
            const response = await getFileDownloadUrl(id);

            if (response.downloadUrl) {
                // Download the file at the specified url
                window
                    .open(response.downloadUrl, '_blank')
                    ?.focus();
            }
        } finally {
            setIsDownloading(false);
        }
    }

    const handleSaveCell = (table: MRT_TableInstance<FileRecord>, cell: MRT_Cell<FileRecord>, value: any) => {
        //if using flat data and simple accessorKeys/ids, you can just do a simple assignment here
        const index = cell.row.index;
        const columnId = cell.column.id;

        const existing: FileRecord[] = table.getRowModel().rows.map(row => row.original);
        const newRow = {...existing[index], [columnId]: value};

        setTags(newRow);

        const newData = [
            ...existing.slice(0, cell.row.index),
            newRow,
            ...existing.slice(cell.row.index + 1),
        ];

        setData(newData); //re-render with new data
    };

    //should be memoized or stable
    const columns = useMemo<MRT_ColumnDef<FileRecord>[]>(
        () => [
            {
                accessorKey: 'id', //access nested data with dot notation
                header: ' ',
                width: 20,
                size: 20,
                maxSize: 20,
                enableSorting: false,
                enableColumnActions: false,
                enableColumnFilter: false,
                Cell: ({cell}) => (
                    <span onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadFile(cell.getValue<string>())
                    }}><IconDownload/></span>
                ),
            },
            {
                accessorKey: 'name', //access nested data with dot notation
                header: 'Name',
                width: 100,
                size: 100,
                enableSorting: false,
                maxSize: 300,
            },
            {
                accessorKey: 'createdAt',
                header: 'Created',
                enableSorting: false,
                enableColumnFilter: false,
                Cell: ({cell}) => (
                    <span>{formatIsoString(cell.getValue<string>())}</span>
                ),
                Edit: ({cell, column, table}) => <>{formatIsoString(cell.getValue<string>())}</>,
            },
            {
                accessorKey: 'tags', //normal accessorKey
                header: 'Tags',
                enableColumnActions: false,
                enableSorting: false,
                Cell: ({cell, table}) => {
                    const tags = cell.getValue<string[]>();

                    return <TagsList
                        tags={tags}
                        label={""}
                        maxWidth={"50px"}
                        setTags={(tags) => handleSaveCell(table, cell, tags)}/>
                }

            },
            {
                accessorKey: 'commonType',
                header: 'Type',
                enableSorting: false,
                width: 100,
                size: 100,
                maxSize: 100,
                Edit: ({cell, column, table}) => <>{cell.getValue<string>()}</>,
            },
        ],
        [],
    );

    const myTailwindColors = {
        // This is an example, replace with actual Tailwind colors
        gray: '#64748b',
        blue: '#0ea5e9',
        red: '#ef4444',
        green: '#10b981',
        // Add other colors you want to include from Tailwind
    };

    const table = useMantineReactTable({
        columns,
        data,
        mantineEditRowModalProps: {
            closeOnClickOutside: true,
            withCloseButton: true,
        },
        enableColumnResizing: true,
        editDisplayMode: 'cell',
        enableFullScreenToggle: false,
        //enableRowSelection: true,
        // @ts-ignore
        getRowId: (row) => row.id,
        initialState: {showColumnFilters: true},
        manualFiltering: true,
        manualPagination: true,
        manualSorting: true,
        rowCount,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        enableStickyHeader: true,
        enableBottomToolbar: true,
        state: {
            columnFilters,
            globalFilter,
            isLoading,
            pagination,
            showAlertBanner: isError,
            showProgressBars: isRefetching,
            sorting,
        },
        mantineTableContainerProps: {sx: {maxHeight: '400px'}},
        mantineToolbarAlertBannerProps: isError
            ? {color: 'red', children: 'Error loading data'}
            : undefined,
    });

    return (
        <div>
            {isDownloading && (
                <LoadingDialog
                    open={true} message={"Preparing to download..."}/>
            )}

            <MantineProvider
                theme={{
                    colorScheme: lightMode, // or 'light', depending on your preference or state
                    colors: {
                        gray: [myTailwindColors.gray],
                        blue: ["#e7eaee", "#c4cbd4", "#a0abb9", "#586d85", "#112e51", "#0f2949", "#071a31", "#051228"],
                        red: [myTailwindColors.red],   // Example color for 'red' palette
                        green: [myTailwindColors.green] // Example color for 'green' palette
                    },
                    // You can also map Mantine's theme colors to match Tailwind's classes as needed
                    primaryColor: 'blue', // Use the name of the key from the 'colors' object
                }}
            >
                <MantineReactTable table={table}/>
            </MantineProvider>
        </div>)
};

export default DataSourcesTable;