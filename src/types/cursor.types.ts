interface Cursor{
    createdAt: string,
    id: string,
}

interface CursorPaginationResult<T> {
    data : T[];
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
}

export {Cursor, CursorPaginationResult}