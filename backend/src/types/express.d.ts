interface AuthPayload {
    userId: string; //any would be bad ts
}
//to modify express's existing request type and add user property to it
//MODULE/ GLObal AUGMENTATION
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload; //? = optional
        }
    }
}
//AuthPayload describes exactly what we put inside JWT
export {};