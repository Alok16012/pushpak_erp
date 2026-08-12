import "@testing-library/jest-dom";

const storage = new Map<string,string>();
const localStorageMock = { getItem:(key:string)=>storage.get(key)??null, setItem:(key:string,value:string)=>storage.set(key,String(value)), removeItem:(key:string)=>storage.delete(key), clear:()=>storage.clear(), key:(index:number)=>Array.from(storage.keys())[index]??null, get length(){return storage.size} };
Object.defineProperty(globalThis,"localStorage",{value:localStorageMock,configurable:true});
Object.defineProperty(window,"localStorage",{value:localStorageMock,configurable:true});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
