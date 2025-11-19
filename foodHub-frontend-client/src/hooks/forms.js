import { useState } from "react";

/*
input:initial value of input tag, function to handle sunmit event
output:
content:
*/
const useForm = (initialValues, submitCallback) => {
  const [inputs, setInputs] = useState(initialValues);
  const handleSubmit = (event) => {
    if (event) event.preventDefault();
    submitCallback();
  };
  const handleInputChange = (event) => {
    event.persist();
    setInputs((inputs) => ({
      ...inputs,
      [event.target.name]: event.target.value,
    }));
  };
  const setInputAddress=(address)=>{
    setInputs({
      ...inputs,
      street:address
    })
  }
  return {
    handleSubmit,
    handleInputChange,
    inputs,
    setInputAddress
  };
};
export default useForm;
