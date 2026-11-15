import { Transaction } from "sequelize";
import newSequelize from "../infra/sequelize";

// Runs `fn` in one database transaction: commit if it finishes, roll back if it throws.
// Pass the transaction to every repo call inside `fn`.
export const withTransaction = async <T>(
    fn: (transaction: Transaction) => Promise<T>
): Promise<T> => {
    const transaction = await newSequelize().transaction();
    try {
        const response = await fn(transaction);
        await transaction.commit();
        return response;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};
