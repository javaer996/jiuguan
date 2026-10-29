import { sql } from "drizzle-orm";
import { char, datetime } from "drizzle-orm/mysql-core";
import { v7 as uuidv7 } from "uuid";

/** UUIDv7 主键，按时间有序，索引局部性更好。 */
export const uuidPk = (name = "id") =>
  char(name, { length: 36 })
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** 业务外键列（统一 char(36)）。 */
export const uuidRef = (name: string) => char(name, { length: 36 });

/**
 * MySQL datetime 列（毫秒精度）。
 * 注意：drizzle 的 datetime 不支持 defaultNow()/onUpdateNow()，
 * 这里显式使用 CURRENT_TIMESTAMP(3)，并用 $onUpdateFn 维护更新时间。
 */
export const dateTimeNow = (name: string) =>
  datetime(name, { fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`);

export const createdAt = () => dateTimeNow("created_at");

export const updatedAt = () =>
  dateTimeNow("updated_at").$onUpdateFn(() => new Date());

/** 创建/更新时间，毫秒精度。 */
export const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** 软删除时间。 */
export const softDelete = () => ({
  deletedAt: datetime("deleted_at", { fsp: 3 }),
});
