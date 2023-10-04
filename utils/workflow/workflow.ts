import {ChatBody, Message, newMessage} from "@/types/chat";
import {sendChatRequest} from "@/services/chatService";
import {findWorkflowPattern, generateWorkflowPrompt} from "@/utils/workflow/aiflow";
import {OpenAIModels, OpenAIModelID} from "@/types/openai";


interface AiTool {
    description:string,
    exec:()=>{}
}

interface Stopper {
    shouldStop: ()=>boolean,
    signal: AbortSignal
}

export const executeJSWorkflow = async (apiKey: string, task: string, customTools: { [p: string]: AiTool }, stopper: Stopper, incrementalPromptResultCallback: (responseText: string) => void) => {

    const abortResult = {success:false, code:null, exec:null, uncleanCode:null, result:null};



    const promptLLMFull = async (persona:string, prompt: string, messageCallback?:(msg:string)=>void) => {
        const chatBody = {
            model: OpenAIModels[OpenAIModelID.GPT_4],
            messages: [newMessage({content:prompt})],
            key: apiKey,
            prompt: persona,
            temperature: 1.0,
        };

        if(stopper.shouldStop()){
            return null;
        }

        console.log("promptLLM", prompt);
        // @ts-ignore
        const response = await sendChatRequest(apiKey, chatBody, null, stopper.signal);
        const reader = response.body?.getReader();
        let charsReceived = '';

        while(true){
            if(stopper.shouldStop()){
                return null;
            }

            // @ts-ignore
            const {value, done} = await reader.read();

            if(done){
                break;
            }

            let chunk = new TextDecoder("utf-8").decode(value);
            charsReceived += chunk;

            if(messageCallback){
                messageCallback(charsReceived);
            }
        }

        return charsReceived;
    }

    const promptLLMCode = (persona:string, prompt: string) => {return promptLLMFull(persona, prompt, incrementalPromptResultCallback);}
    const promptLLM = (persona:string, prompt: string) => {return promptLLMFull(persona, prompt);}

    const tools = {
        promptLLM: { description:"(personaString,promptString):Promise<String> //personaString should be a detailed persona, such as an expert in XYZ relevant to the task, promptString must include detailed instructions for the LLM and any data that the prompt operates on as a string", exec:promptLLM },
        tellUser: {
            description:"(msg:string)//output a message to the user",
            exec:(msg: string)=>console.log(msg),
        },
        // readXlsxFile: {
        //     description:"(document.raw)=>Promise<[[row1col1,row1col2,...],[row2col1,row2col2...]...]>",
        //     exec: readXlsxFile
        // },
        log: { description:"(msgString):void", exec:(msgString: string) => console.log(msgString)},
        ...customTools,
    };


    // @ts-ignore
    const extraInstructions = [
      "Try to do as much work in code as possible without prompting the LLM. Only prompt the LLM for outlining, " +
      "analyzing text, summarizing, writing, and other natural language processing tasks.",

        "If there is a library that you wish you had been able to use, include a comment about that in" +
        "the code in the form '// @library-wish <name-of-npm-module>. Note, only client-side libraries are allowed.",

        // @ts-ignore
        (tools.getDocuments && tools.getDocuments.exec().length > 0)?
            "Before using a document, make sure and describe its structure and properties relevant to the task." +
            "Then, think step-by-step how to use the document properties to accomplish the task." : "",
        "When you produce a result, produce it as a json object has the following format:" +
        "{type:'text,table,code',data:<your output>}. If you specify a table, you should make" +
        " the output an array of objects where each object is a row and the properties of the object " +
        "are the columns. For text, make sure your output is a string that can also have markdown. For" +
        " code, your output should be a string."
    ];

    if(stopper.shouldStop()){
        return abortResult;
    }
    let prompt = generateWorkflowPrompt(task, tools, extraInstructions);

    let success = false;
    let tries = 3;

    let finalFn = null;
    let fnResult = "";
    let cleanedFn = null;
    let uncleanedCode = null;

    const javascriptPersona = `Act as an expert Javascript developer. You write extremely efficient programs 
    that solve the problem with the minimum amount of code. You never comment your programs or explain them.
    Whenever you write prompts for an LLM, you are an expert prompt engineer and write detailed prompts with
    detailed step-by-step instructions, personas that are specific to the task, and include all of the relevant
    information needed to perform the task. Your plans are extremely detailed and concrete with steps in your
    plans being easily translatable to code.
    
    RULES:
    --------------
    1. You prompt the LLM to perform tasks that require reasoning about text, writing text, outlining text,
       extracting or filtering information from text, etc. However, you don't use the LLM for basic string
       manipulation, such as combining or joining outputs, unless they need to be potentially converted into
       another textual format. 
    2. If you are summarizing, outlining, filtering, extracting, etc. with text, make sure the prompt is designed
       to be totally factual and not include details that aren't in the original information.
    3. You can use any standard Javascript that you want, just don't access global state, the document, etc.
    4. If the output of your work is a report or unstructured textual format, you can prompt the LLM and give
       it a detailed prompt to make it formatted beautifully.
    5. You can define helper functions, but they must be defined inside of the workflow function.
    `;

    while(!success && tries > 0 && !stopper.shouldStop()) {

        console.log("Prompting for the code for task: ", task);

        await tools.tellUser.exec("[thinking]");
        uncleanedCode = await promptLLMCode(javascriptPersona,prompt);

        if(stopper.shouldStop()){
            return abortResult;
        }
        //console.log("Uncleaed code:", uncleanedCode)


        cleanedFn = findWorkflowPattern(uncleanedCode || "");
        finalFn = null;
        fnResult = "";

        console.log(cleanedFn);
        if (cleanedFn != null) {

            try {

                const fnlibs = {}
                Object.entries(tools).forEach(([key,tool])=>{
                    // @ts-ignore
                    fnlibs[key] = tool.exec;
                })


                if(stopper.shouldStop()){
                    return abortResult;
                }

                tools.tellUser.exec("Loading the workflow...");
                let context = {workflow:(fnlibs:{}):any=>{}};
                eval("context.workflow = " + cleanedFn);

                console.log("workflow fn", context.workflow);

                finalFn = context.workflow;
                let result = await context.workflow(fnlibs);

                console.log("Result:", result);
                console.log("Will try again:", result == null);
                fnResult = result;
                success = result != null;

            } catch (e) {
                console.log(e);
                tools.tellUser.exec("I made a mistake, trying again...");
            }

            tries = tries - 1;
        }

        if(success){
            return {success:success, code:cleanedFn, exec:finalFn, uncleanCode:uncleanedCode, result:fnResult};
        }
    }
    return {success:false, code:cleanedFn, exec:finalFn, uncleanCode:uncleanedCode, result:fnResult};
};

export const extractJsonObjects = (text: string) => {

    let jsonObjects = [];
    let buffer = "";
    let stack = [];
    let insideString = false;

    for (let char of text) {
        if (char === '"' && (stack.length === 0 || stack[stack.length - 1] !== '\\')) {
            insideString = !insideString;
            buffer += char;
        } else if (insideString) {
            buffer += char;
        } else if (char === '{' || char === '[') {
            stack.push(char);
            buffer += char;
        } else if (char === '}' || char === ']') {
            if (stack.length === 0) continue;
            let openingChar = stack.pop();
            buffer += char;
            if ((openingChar === '{' && char === '}') || (openingChar === '[' && char === ']') && stack.length === 0) {
                try {
                    console.log("Attempting to parse:",buffer);
                    let jsonObj = JSON.parse(buffer);
                    jsonObjects.push(jsonObj);
                } catch (error) {
                    // failed to parse json
                    console.log(error);
                }
                buffer = "";
            } else {
                continue;
            }
        } else {
            buffer += char;
        }
    }

    while (jsonObjects.length === 1) {
        jsonObjects = jsonObjects.pop();
    }

    return jsonObjects;
}

function parseJSONObjects(str:string) {
    let stack = [];
    let result = [];
    let temp = "";
    let inString = false;
    let inObjectOrArray = false;

    for (let ch of str) {
        if (ch === '"' && str[str.indexOf(ch) - 1] !== '\\') {
            inString = !inString;
        }

        if (!inString) {
            if (ch === '{' || ch === '[') {
                inObjectOrArray = true;
                stack.push(ch);
                temp += ch;
            } else if ((ch === '}' && stack[stack.length - 1] === '{') || (ch === ']' && stack[stack.length - 1] === '[')) {
                stack.pop();
                temp += ch;

                if (stack.length === 0) {
                    inObjectOrArray = false;
                    result.push(JSON.parse(temp));
                    temp = "";
                }
            } else if (inObjectOrArray) {
                temp += ch;
            }
        } else {
            temp += ch;
        }
    }

    while (result.length === 1) {
        result = result.pop();
    }

    return result;
}

export default class Workflow {

    constructor(public name: string, public workflow: Op[]) {
    }

    runner = (extraOps: any, initialContext: Context | undefined, listener: (stage: string, op: Op, data: {}) => void) => {
        return createWorkflowRunner(
            this.workflow,
            {...ops, ...extraOps},
            initialContext,
            listener
        );
    }

    run = async (initialContext: Context, extraOps: {}, listener: { (stage: string, op: Op, data: {}): void }) => {
        return new Promise(async (resolve, reject) => {
            try {
                const runner = createWorkflowRunner(this.workflow, {...ops, ...extraOps}, initialContext, listener);

                let result;
                for await (const res of runner()) {
                    result = await res; // Hold onto the result to retrieve the final context
                    //console.log(`Generator returned: ${JSON.stringify(result)}`, result);
                }

                // Resolve with the final context
                resolve(result ? result[0] : initialContext);

            } catch (error) {
                console.error(`Error running workflow: ${error}`);
                reject(error);
            }
        });
    };
}

export interface Context {
    [key: string]: any;
}

export interface Op {
    op: string;

    [otherProps: string]: any;
}

export interface OpRunner {
    (op: Op, context: Context): Promise<any>;
}

export function fillTemplate(template: string, context: Context): string {
    return template.replace(/\{\{([^}]+)\}\}/g, function (_matchedString, key) {
        let value: any = context;

        key.split('.').forEach((k: string | number) => {

            console.log(k, JSON.stringify(value[k]));

            if (value && value.hasOwnProperty(k)) {
                value = value[k];
            } else {
                value = undefined;
            }
        });

        if(value && typeof value !== 'string'){
            value = JSON.stringify(value);
        }

        return typeof value !== 'undefined' ? value : '';
    });
}

export const ops: { [opName: string]: OpRunner } = {

    prompt: async (op: Op, context: Context) => {

        if (!op.message) throw new Error("The 'message' property is missing in 'send' operation.");

        let message = newMessage({
            ...op.message,
            content: fillTemplate(op.message.content, context)
        });

        const chatBody: ChatBody = {
            model: op.model,
            messages: [message],
            key: op.apiKey,
            prompt: op.rootPrompt,
            temperature: op.temperature,
        };

        return new Promise((resolve, reject) => {
            sendChatRequest(chatBody, null, null)
                .then(async (result) => {
                    let data = await result.text()
                    resolve(data);
                })
        });

    },

    extractJson: async (op: Op, context: Context) => {
        // Given json mixed with text describing it, this
        // function will find and extract all of the valid json
        // and return a list of the valid json objects it found

        return parseJSONObjects(fillTemplate(op.input, context));
    },

    input: async (op: Op, context: Context) => {
        // Placeholder function for input
        return op.variables; // handle input operation
    },

    split: async (op: Op, context: Context) => {
        // Placeholder function for split
        return [context[op.input]]; // handle split operation
    },

    map: async (op: Op, context: Context) => {
        let result = [];

        console.log("Map", context[op.input]);

        for (const item of context[op.input]) {

            const newContext = {...context, [op.itemVariable]: item};

            for (const operation of op.function) {
                const mapResult = await executeOp(operation, newContext);
                console.log("mapResult", mapResult["_output"]);
                result.push(mapResult["_output"]);
            }
        }
        return result;
    },

    format: async (op: Op, context: Context) => {
        let result = fillTemplate(op.input, context);
        return result;
    },

    join: async (op: Op, context: Context) => {
        const stringify = (s: any) => {
          return (typeof s !== 'string')? JSON.stringify(s) : s;
        };

        const sep = op.separator ? op.separator : "";
        let result = context[op.input].reduce((s: any, v: any) => stringify(s)+sep+stringify(v));
        return result;
    },

    parallel: async (op: Op, context: Context) => {
        return await Promise.all(op.ops.map((itemOp: Op) => executeOp(itemOp, context)));
    },

    sequential: async (op: Op, context: Context) => {
        let result;
        let results = []

        // Force a deep copy to avoid shenanigans
        let tempContext = JSON.parse(JSON.stringify(context));

        for (const itemOp of op.ops) {
            result = await executeOp(itemOp, tempContext);
            results.push(JSON.parse(JSON.stringify(result)));

            if (itemOp.output) {
                tempContext[itemOp.output] = result[itemOp.output];
            }
        }
        return results;
    },

    fetch: async (op: Op, context: Context) => {
        const response = await fetch(op.url, {
            method: op.method || 'GET',
            headers: op.headers || {},
            body: op.body || null,
        });
        return response.json();
    },

    parseJSON: async (op: Op, context: Context) => {
        return JSON.parse(context[op.input]);
    },

    domQuery: async (op: Op, context: Context) => {
        return document.querySelectorAll(op.query);
    },

    localStorage: async (op: Op, context: Context) => {
        switch (op.action) {
            case 'get':
                return localStorage.getItem(op.key);
            case 'set':
                localStorage.setItem(op.key, op.value);
                break;
            case 'remove':
                localStorage.removeItem(op.key);
                break;
        }
    },

    sessionStorage: async (op: Op, context: Context) => {
        switch (op.action) {
            case 'get':
                return sessionStorage.getItem(op.key);
            case 'set':
                sessionStorage.setItem(op.key, op.value);
                break;
            case 'remove':
                sessionStorage.removeItem(op.key);
                break;
        }
    },

    cookie: async (op: Op, context: Context) => {
        const key = fillTemplate(op.key, context);
        const value = fillTemplate(op.value, context);

        switch (op.action) {
            case 'get':
                // @ts-ignore
                return document.cookie.split('; ').find(row => row.startsWith(key)).split('=')[1];
            case 'set':
                document.cookie = `${key}=${value}`;
                break;
            case 'remove':
                document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                break;
        }
    },

    redirect: async (op: Op, context: Context) => {
        window.location.href = fillTemplate(op.url, context);
    },

    // executeJS: async (op: Op, context: Context) => {
    //     return eval(op.script);
    // },

    formInput: async (op: Op, context: Context) => {
        const form = document.querySelector(op.formSelector);
        if (form) {
            const input = form.querySelector(op.fieldSelector);
            if (input) input.value = op.value;
        }
    },

    click: async (op: Op, context: Context) => {
        const element = document.querySelector(op.selector);
        if (element) {
            element.click();
        }
    },

    geolocation: async (op: Op, context: Context) => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject("Geolocation is not supported by your browser");
            } else {
                navigator.geolocation.getCurrentPosition(position => resolve(position), err => reject(err));
            }
        });
    },

    notification: async (op: Op, context: Context) => {
        const title = fillTemplate(op.title, context);

        if (!("Notification" in window)) {
            throw new Error("This browser does not support desktop notification");
        } else if (Notification.permission === "granted") {
            const notification = new Notification(title, op.options);
        } else { // @ts-ignore
            if (Notification.permission !== 'denied' || Notification.permission === "default") {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    const notification = new Notification(title, op.options);
                }
            }
        }
    },

    history: async (op: Op, context: Context) => {
        switch (op.action) {
            case 'push':
                history.pushState(op.state, op.title, op.url);
                break;
            case 'replace':
                history.replaceState(op.state, op.title, op.url);
                break;
            case 'back':
                history.back();
                break;
            case 'forward':
                history.forward();
                break;
            case 'go':
                history.go(op.value);
                break;
        }
    },

    fileAPI: async (op: Op, context: Context) => {
        // Placeholder function for File API. Detailed implementation will depend on the type of operation e.g. readFile, writeFile, etc.
        console.log('File API used');
    },

    navigator: async (op: Op, context: Context) => {
        // @ts-ignore
        return navigator[op.property];
    },

    audioAPI: async (op: Op, context: Context) => {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.value = 3000;
        oscillator.start();
        return oscillator;
    },

    consoleLog: async (op: Op, context: Context) => {
        console.log(fillTemplate(op.message, context));
    },

    noOp: async (op: Op, context: Context) => {
    }
};

export async function executeOp(operation: Op, context: Context = {}): Promise<any> {
    const opRunner = ops[operation.op];
    if (!opRunner) throw new Error(`Unknown operation: ${operation.op}`);

    let localContext = {...context}
    const result = await opRunner(operation, localContext);

    if (operation.output) {
        localContext[operation.output] = result;
    }
    localContext["_output"] = result;

    return localContext;
}

export interface WorkflowRunner {
    (): AsyncGenerator<Promise<any>, void, any>;
}

export const createWorkflowRunner = (
    workflow: Op[],
    executors: Record<string, (op: Op, context: Context) => Promise<any>>,
    initialContext: Context = {},
    listener: (stage: string, op: Op, data: {}) => void
) => {
    return async function* () {
        const context = {...initialContext};

        listener('workflow:start', {op: "noOp"}, context);

        const execOp = async (op: Op): Promise<[{}, any]> => {

            listener("op:pre", op, context);

            const executor = executors[op.op];
            //console.log("op:pre/executor", executors[op.op]);

            const result = executor != null ? await executors[op.op](op, context) : Promise.reject("Unknown operaton: " + op.op);
            //console.log("op:post/result", result);

            if (op.output) {
                context[op.output] = result;
            }

            listener("op:post", op, context);

            return [context, result];
        };

        for (let op of workflow) {
            if (op.op === 'until') {
                const condition = op.condition;
                while (!context[condition]) {
                    for (let innerOp of op.ops) {
                        yield execOp(innerOp);
                    }
                }
            } else if (op.op === 'while') {
                const condition = op.condition;
                while (context[condition]) {
                    for (let innerOp of op.ops) {
                        yield execOp(innerOp);
                    }
                }
            } else {
                yield execOp(op);
            }
        }

        listener('workflow:done', {op: "noOp"}, context);
    }
};