export function updatePage(newPage){
    return {
        type:"UPDATE_PAGE",
        payload:{
            page:newPage
        }
    };
}