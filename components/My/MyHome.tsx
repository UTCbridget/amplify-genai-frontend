import DataSourcesTable from "@/components/DataSources/DataSourcesTable";
import {FC, useContext, useState} from "react";
import {IconFiles, IconX} from "@tabler/icons-react";
import HomeContext from "@/pages/api/home/home.context";



export interface MyHomeProps {

}

export const MyHome: FC<MyHomeProps> = ({

                                  }) => {
    const {
        state: { lightMode },
    } = useContext(HomeContext);


    const [responseTokenRatio, setResponseTokenRatio] = useState(
        3
    );

    const {dispatch: homeDispatch, state:{statsService, featureFlags}} = useContext(HomeContext);

    return (
        <div className="relative flex-1 overflow-hidden bg-white dark:bg-transparent">
                <div className="mx-auto flex flex-col p-2 text-gray-600 dark:text-gray-400">
                    <div className="pt-3 px-2 items-center mt-6 text-left text-3xl font-bold  text-gray-600  dark:text-gray-400 flex flex-row items-center">
                        <div>
                            <IconFiles size={36}/>
                        </div>
                        <h3 className="ml-2">Your Files</h3>
                        <button 
                            onClick={() => homeDispatch({field: 'page', value: 'chat'})}
                            className="ml-auto flex items-center text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-white"
                            title="Close">
                            <IconX size={22} /> 
                        </button>
                    </div>
                    <div className="files-table mt-2">
                        <DataSourcesTable />
                    </div>
                </div>
        </div>
    );
}