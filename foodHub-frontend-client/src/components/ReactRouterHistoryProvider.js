import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { useEffect } from "react";

export let historyReactRouterObj;

export default function ReactRouterHistoryProvider(props){
    const history=useHistory();
    useEffect(()=>{
        historyReactRouterObj=history;
    },[history]);
    
    return null;
}