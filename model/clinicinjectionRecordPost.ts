// To parse this data:
//
//   import { Convert } from "./file";
//
//   const clinicinjectionRecordPost = Convert.toClinicinjectionRecordPost(json);

export interface ClinicinjectionRecordPost {
    rid:             number;
    reserveID:       number;
    appointment_aid: number;
    vaccine:         string;
    date:            Date;
    vaccine_label:   string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicinjectionRecordPost(json: string): ClinicinjectionRecordPost[] {
        return JSON.parse(json);
    }

    public static clinicinjectionRecordPostToJson(value: ClinicinjectionRecordPost[]): string {
        return JSON.stringify(value);
    }
}
