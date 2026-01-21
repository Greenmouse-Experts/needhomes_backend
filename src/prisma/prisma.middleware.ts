import { toTimezone } from 'app/common';
import { Prisma } from '@prisma/client';

export function base() {
  return async (args: any, query: (args: any) => Promise<any>) => {
    // Always enforce Africa/Lagos timezone by default
    let tz = 'Africa/Lagos';

    // If tz is provided in args, override default then strip it out
    if (args.args?.tz) {
      tz = args.args.tz;
      delete args.args.tz;
    }
    if (args.args?.where?.tz) {
      tz = args.args.where.tz;
      delete args.args.where.tz;
    }

    // Ensure soft-deleted records are excluded
    if (args.action.startsWith('find')) {
      args.args.where = {
        ...args.args.where,
        deleted_at: null,
      };
    }

    // Default pagination for findMany
    if (args.action.startsWith('findMany')) {
      const paginationArgs = ['skip', 'take', 'cursor'];
      const pagination = paginationArgs.reduce((acc: any, arg: string) => {
        if (args.args[arg]) {
          acc[arg] = args.args[arg];
        }
        return acc;
      }, {});

      const defaultPagination = {
        skip: 0,
        take: 10,
        orderBy: {
          created_at: Prisma.SortOrder.desc,
        },
      };

      args.args = {
        ...args.args,
        ...defaultPagination,
        ...pagination,
      };
    }

    // For create/update: normalize datetime fields into Africa/Lagos
    if (
      args.action.startsWith('create') ||
      args.action.startsWith('update') ||
      args.action.startsWith('upsert')
    ) {
      const normalizeDates = (obj: any) => {
        for (const key in obj) {
          if (
            obj.hasOwnProperty(key) &&
            (key.toLowerCase().includes('date') ||
              key.endsWith('_at') ||
              key.endsWith('_time'))
          ) {
            if (obj[key]) {
              obj[key] = toTimezone(obj[key], tz);
            }
          }
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            normalizeDates(obj[key]);
          }
        }
      };

      if (args.args.data) normalizeDates(args.args.data);
    }

    const result = await query(args);

    // Convert result datetimes into Africa/Lagos
    if (
      (args.action.startsWith('find') || args.action.startsWith('findMany')) &&
      result
    ) {
      const convertDates = (item: any) => {
        if (item.created_at) item.created_at = toTimezone(item.created_at, tz);
        if (item.updated_at) item.updated_at = toTimezone(item.updated_at, tz);
        if (item.expires_at) item.expires_at = toTimezone(item.expires_at, tz);

        for (const key in item) {
          if (
            item.hasOwnProperty(key) &&
            (key.toLowerCase().includes('date') ||
              key.endsWith('_at') ||
              key.endsWith('_time'))
          ) {
            if (item[key]) item[key] = toTimezone(item[key], tz);
          }
        }
      };

      if (Array.isArray(result)) {
        result.forEach(convertDates);
      } else {
        convertDates(result);
      }
    }

    return result;
  };
}
