type OrderedUnit = { order: number; created_at: string };

/**
 * 単元を新しい順（order の降順）に並べ替える。
 * order は作成時点の単元数から決まるため、削除後に追加すると重複しうる。その場合は作成日時の新しい方を上にする
 */
export function sortUnitsNewestFirst<T extends OrderedUnit>(units: T[]): T[] {
  return [...units].sort((a, b) => {
    if (a.order !== b.order) return b.order - a.order;
    return b.created_at.localeCompare(a.created_at);
  });
}
