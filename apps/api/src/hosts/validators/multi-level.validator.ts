import { 
  ValidatorConstraint, 
  ValidatorConstraintInterface, 
  ValidationArguments, 
  registerDecorator, 
  ValidationOptions 
} from 'class-validator';

@ValidatorConstraint({ name: 'multiLevelConsistent', async: false })
export class MultiLevelConsistentConstraint implements ValidatorConstraintInterface {
  validate(numberOfLevels: number, args: ValidationArguments) {
    const obj = args.object as any;
    
    // If numberOfLevels is provided, isMultiLevel must be true
    if (numberOfLevels !== undefined && numberOfLevels !== null) {
      return obj.isMultiLevel === true;
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'numberOfLevels can only be set when isMultiLevel is true';
  }
}

export function IsMultiLevelConsistent(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: MultiLevelConsistentConstraint,
    });
  };
}