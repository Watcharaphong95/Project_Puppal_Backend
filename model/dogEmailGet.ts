// To parse this data:
//
//   import { Convert } from "./file";
//
//   const dogsEmailGet = Convert.toDogsEmailGet(json);

export interface DogsEmailGet {
    dogId:             number;
    user_email:        string;
    name:              string;
    breed:             string;
    gender:            string;
    color:             string;
    defect:            string;
    birthday:          string;
    congentialDisease: string;
    sterilization:     number;
    Hair:              string;
    image:             string;
    vaccineType:       number | null;
    date:              null | string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toDogsEmailGet(json: string): DogsEmailGet[] {
        return JSON.parse(json);
    }

    public static dogsEmailGetToJson(value: DogsEmailGet[]): string {
        return JSON.stringify(value);
    }
}
