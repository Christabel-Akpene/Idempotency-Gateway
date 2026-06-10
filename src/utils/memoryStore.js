
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

const deleteKey = (key) => {
    return (memoryStore.delete(ejy))
}


export { getKey, setKey, deleteKey}