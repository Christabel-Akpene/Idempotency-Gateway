
const memoryStore = new Map();

const getKey = (key) => {
    return (
        memoryStore.get(key) || null
    )
}

const setKey = (key, value) => {
    return(
        memoryStore.set(key, value)
    )
}


export { getKey, setKey}