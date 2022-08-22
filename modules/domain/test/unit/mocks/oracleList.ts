import { OracleType } from "../enums";

export const mockedOracleList = [
    {
        id: "1",
        type: OracleType.BANK,
    },
    {
        id: "2",
        type: OracleType.BANK,
    },
    {
        id: "3",
        type: OracleType.CREDIT_UNION,
    }
]

export const mockedOracleListTest = [
    {
        id: "1",
        type: OracleType.BANK,
    },
    {
        id: "2",
        type: OracleType.BANK,
    },
    {
        id: "NonExistingOracleId",
        type: OracleType.CREDIT_UNION,
    }
]