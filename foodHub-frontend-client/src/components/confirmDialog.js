import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button 
} from '@material-ui/core';

export default function ConfirmationDialog({ open, onClose, onConfirm, title, message }) {

  const handleConfirm = () => {
    onConfirm(); // Execute the confirmation logic passed from the parent
    onClose();   // Close the dialog
  };

  const handleCancel = () => {
    onClose(); // Just close the dialog
  };
  
  return (
    <Dialog open={open} onClose={handleCancel}>
      
      <DialogTitle>{title}</DialogTitle>
      
      <DialogContent>
        {/* The body text of the confirmation message */}
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      
      <DialogActions>
        {/* The 'No' or Dismissive Action */}
        <Button onClick={handleCancel} color="primary">
          No
        </Button>
        
        {/* The 'Yes' or Confirming Action (often primary/danger color) */}
        <Button onClick={handleConfirm} color="error" variant="contained">
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}