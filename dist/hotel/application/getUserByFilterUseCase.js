"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserByFilterUseCase = void 0;
const hotel_1 = require("../domain/validation/hotel");
const class_validator_1 = require("class-validator");
class GetUserByFilterUseCase {
    constructor(usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }
    run(filter, email, name, phone_number) {
        return __awaiter(this, void 0, void 0, function* () {
            let post = new hotel_1.ValidatorFilter(filter, email, name, phone_number);
            const validation = yield (0, class_validator_1.validate)(post);
            if (validation.length > 0) {
                throw new Error(JSON.stringify(validation));
            }
            try {
                const getByFilter = yield this.usuarioRepository.getUserByFilter(filter, email, name, phone_number);
                return getByFilter;
            }
            catch (error) {
                return null;
            }
        });
    }
}
exports.GetUserByFilterUseCase = GetUserByFilterUseCase;
