import { User } from "../domain/user";
import { UserRepository } from "../domain/userRepository";
import { query } from "../../database/msql";
import { isEmailRegistered } from "./validation/usermsql";
import { compare, encrypt } from '../../helpers/ashs';
import { tokenSigIn } from "../../helpers/token";


export class MysqlUserRepository implements UserRepository{

    async createUser(uuid: string, name: string, last_name: string, phone_number: string, email: string, password: string, status: boolean): Promise<string | User | Error | null> {
        try {
            let sql = "INSERT INTO users(uuid, name, last_name, phone_number, email, password, status) VALUES ($1, $2, $3, $4, $5, $6, $7)";
            const params: any[] = [uuid, name, last_name, phone_number, email, password, status];

            console.log('Executing SQL:', sql);
            console.log('Parameters:', params);

            const result = await query(sql, params);
            console.log('Query Result:', result);

            // Asegúrate de que result tenga el formato esperado antes de intentar desestructurarlo

            return new User(uuid, name, last_name, phone_number, email, password, status);
        } catch (error) {
            console.error("Error adding user:", error);
            return error as Error;
        }
    }

    async getAllUsers(): Promise<User[] | null> {
        try {
            const sql = "SELECT * FROM users";
            const [rows]: any = await query(sql); // Esto probablemente devuelve un tipo de dato más complejo
            if (!Array.isArray(rows)) {
                throw new Error('Rows is not an array'); // o maneja este caso como prefieras
            }
            const users: User[] = rows.map(row => new User(row.uuid, row.name, row.last_name,row.phone_number, row.email, row.password, row.status));
            return users
        } catch (error) {
            console.error(error);
            return null; // retornas null o podrías optar por retornar un array vacío dependiendo de tu lógica de negocio
        }
    }

    async getById(uuid: string): Promise<User | null> {
        try {
            const sql = "SELECT * FROM users WHERE uuid = ? LIMIT 1"; // SQL para obtener un usuario por uuid
            const [rows]: any = await query(sql, [uuid]); // Ejecutamos la consulta, pasando el uuid como parámetro

            if (!rows || rows.length === 0) return null; // Si no hay resultados, retornamos null        
            const row = rows[0]; // Tomamos el primer resultado (ya que uuid debería ser único)
            // Retornamos una nueva instancia de User con los datos obtenidos
            return new User(row.uuid, row.name, row.last_name,row.phone_number, row.email, row.password,row.status);
        } catch (error) {
            console.error(error);
            return null; // En caso de error, retornamos null
        }
    }
    async updateUserById(uuid: string, name?: string, last_name?: string,phone_number?: string, email?: string): Promise<User | null> {
        
        const updates: { [key: string]: string } = {};
        if (name !== undefined) updates.name = name;
        if (last_name !== undefined) updates.last_name = last_name;
        if (phone_number !== undefined) updates.phone_number = phone_number;
        if (email !== undefined) updates.email = email;

        const keys = Object.keys(updates);
        if (keys.length === 0) return null; // No hay nada que actualizar.

        const sqlParts = keys.map(key => `${key} = ?`);
        const sql = `UPDATE users SET ${sqlParts.join(', ')} WHERE uuid = ?`;

        try {
            const values = keys.map(key => updates[key]);
            values.push(uuid); // Añade el UUID al final del array de valores.
            await query(sql, values); // Ejecuta la consulta SQL.
          
            const [updatedRows]: any = await query('SELECT * FROM users WHERE uuid = ?', [uuid]);
            if (!updatedRows || updatedRows.length === 0) {
                throw new Error('No user found with the provided UUID.');
            }

            const updatedUser = new User(
                updatedRows[0].uuid,
                updatedRows[0].name,
                updatedRows[0].last_name,
                updatedRows[0].phone_number,
                updatedRows[0].email,
                updatedRows[0].password,
                updatedRows[0].loan_status,
            );

            return updatedUser;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error; // O maneja el error de la manera que prefieras.
        }

    }
    async deleteUser(uuid: string): Promise<string | null> {
        try {
            const sql = 'DELETE FROM users WHERE uuid = ?';
            const result: any = await query(sql, [uuid]);
            if (result[0].affectedRows === 0){
                return null;
            } 

            return 'User deleted successfully.';
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error; // O maneja el error de la manera que prefieras.
        }
    }

    async updatePassword(email: string, password: string): Promise<User | null> {
        try {
            // Verificar si el correo electrónico existe en la base de datos
            const checkUserSql = 'SELECT * FROM users WHERE email = ?';
            const [userRows]: any = await query(checkUserSql, [email]);
            if (userRows.length === 0) {
                // El correo electrónico no existe en la base de datos
                return null;
            }
    
            // Asumiendo que 'password' ya está cifrado.
            const hashPassword = await encrypt(password);
            const updateSql = 'UPDATE users SET password = ? WHERE email = ?';
            const result: any = await query(updateSql, [hashPassword, email]);
    
            // Verificar si se actualizó alguna fila
            if (!result || result.affectedRows === 0) {
                return null;
            }
    
            // Obtener el usuario actualizado
            const [updatedRows]: any = await query('SELECT * FROM users WHERE email = ?', [email]);
            if (updatedRows.length === 0) {
                return null;
            }
    
            const updatedUser = new User(
                updatedRows[0].uuid,
                updatedRows[0].name,
                updatedRows[0].last_name,
                updatedRows[0].phone_number,
                updatedRows[0].email,
                updatedRows[0].password,
                updatedRows[0].status
            );
    
            return updatedUser;
        } catch (error) {
            console.error('Error updating password:', error);
            throw error; // O maneja el error de la manera que prefieras.
        }
    }
    
    async loginUser(email: string, password: string): Promise<string | null> {
        try {
            // Primero, obtener el usuario por email.
            const [users]: any = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
          
            if (!users || users.length === 0) {
                return null
            }

            const user = users[0];

            // Verificar si la contraseña proporcionada coincide con la almacenada en la base de datos.
            const passwordMatches = await compare(password, user.password); //pasar a la parte 
          

            if (!passwordMatches) {
                return 'Unauthorized'
            }

            // Aquí podrías generar y devolver un token JWT si estás usando autenticación basada en tokens.
            // Por ahora, simplemente devolvemos un mensaje de éxito.
            const token:string = tokenSigIn(user.uuid,user.email)
            return token;

        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    }
    async getUserByFilter(
        filter: string,
        email?: string | undefined,
        name?: string | undefined,
        phone_number?: string | undefined
    ): Promise<User[] | null> {
        try {
            let sql: string;
            let value: string | undefined;
            switch (filter) {
                case 'email':
                    if (!email) throw new Error('Email is required when filter is email');
                    sql = 'SELECT * FROM users WHERE email = ?'; // Se ha removido LIMIT 1
                    value = email;
                    break;
                case 'name':
                    if (!name) throw new Error('Name is required when filter is name');
                    sql = 'SELECT * FROM users WHERE name = ?'; // Se ha removido LIMIT 1
                    value = name;
                    break;
                case 'phone_number':
                    if (!phone_number) throw new Error('Phone number is required when filter is phone_number');
                    sql = 'SELECT * FROM users WHERE phone_number = ?'; // Se ha removido LIMIT 1
                    value = phone_number;
                    break;
                default:
                    throw new Error('Invalid filter type');
            }

            const [rows]: any = await query(sql, [value]);
            console.log(rows)
            if (rows.length === 0) {
                return null;
            }            
            return rows.map((row: User) => new User(row.uuid, row.name, row.last_name, row.phone_number, row.email, row.password, row.status));

        } catch (error) {
            console.error(error);
            return null;
        }
    }
    async getByEmail(email: string): Promise<User | null> {
        try {
            const sql = "SELECT * FROM users WHERE email = ? LIMIT 1"; // SQL para obtener un usuario por uuid
            const [rows]: any = await query(sql, [email]); // Ejecutamos la consulta, pasando el uuid como parámetro

            if (!rows || rows.length === 0) return null; // Si no hay resultados, retornamos null        
            const row = rows[0]; // Tomamos el primer resultado (ya que uuid debería ser único)
            // Retornamos una nueva instancia de User con los datos obtenidos
            return new User(row.uuid, row.name, row.last_name,row.phone_number, row.email, row.password,row.status);
        } catch (error) {
            console.error(error);
            return null; // En caso de error, retornamos null
        }
    }


}