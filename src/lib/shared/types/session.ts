export type PaginationInput = {
	limit: number;
	offset: number;
};

export type PaginatedResult<T> = {
	items: T[];
	limit: number;
	offset: number;
	total: number | null;
};
