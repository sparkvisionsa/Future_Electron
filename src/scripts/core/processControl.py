import asyncio, json, sys

from typing import Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ProcessState:
    """State for a single process"""
    process_id: str
    process_type: str = "unknown"
    paused: bool = False
    stopped: bool = False
    
    # Progress tracking
    total: int = 0
    completed: int = 0
    failed: int = 0
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    paused_at: Optional[datetime] = None
    
    # Metadata
    metadata: Dict = field(default_factory=dict)
    
    def update_progress(self, completed: int = None, failed: int = None, total: int = None):
        """Update progress counters"""
        if completed is not None:
            self.completed = completed
        if failed is not None:
            self.failed = failed
        if total is not None:
            self.total = total
        self.updated_at = datetime.utcnow()
    
    def get_percentage(self) -> float:
        """Calculate completion percentage"""
        if self.total == 0:
            return 0.0
        return round((self.completed / self.total) * 100, 2)
    
    def to_dict(self) -> dict:
        """Convert state to dictionary"""
        return {
            "process_id": self.process_id,
            "process_type": self.process_type,
            "paused": self.paused,
            "stopped": self.stopped,
            "total": self.total,
            "completed": self.completed,
            "failed": self.failed,
            "percentage": self.get_percentage(),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "paused_at": self.paused_at.isoformat() if self.paused_at else None,
            "metadata": self.metadata
        }


class ProcessController:
    """Centralized controller for all process states"""
    
    _instance: Optional['ProcessController'] = None
    
    def __init__(self):
        self._processes: Dict[str, ProcessState] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
    
    @classmethod
    def get_instance(cls) -> 'ProcessController':
        """Get or create the singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset_instance(cls):
        """Reset the singleton instance (useful for testing)"""
        cls._instance = None
    
    def create_process(
        self, 
        process_id: str,
        process_type: str = "unknown",
        total: int = 0,
        **metadata
    ) -> ProcessState:
        """Create a new process state"""
        state = ProcessState(
            process_id=process_id,
            process_type=process_type,
            total=total,
            metadata=metadata
        )
        
        self._processes[process_id] = state
        self._locks[process_id] = asyncio.Lock()
        
        self._emit_event({
            "type": "process_initialized",
            "processId": process_id,
            "processType": process_type,
            "total": total,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return state
    
    def get_process(self, process_id: str) -> Optional[ProcessState]:
        """Get process state by ID"""
        return self._processes.get(process_id)
    
    def get_lock(self, process_id: str) -> Optional[asyncio.Lock]:
        """Get the lock for a process"""
        return self._locks.get(process_id)
    
    async def update_progress(
        self, 
        process_id: str, 
        completed: int = None,
        failed: int = None, 
        total: int = None,
        emit_progress: bool = True
    ) -> Optional[ProcessState]:
        """Update process progress with thread safety"""
        state = self.get_process(process_id)
        if not state:
            return None
        
        lock = self.get_lock(process_id)
        if lock:
            async with lock:
                state.update_progress(completed, failed, total)
        else:
            state.update_progress(completed, failed, total)
        
        if emit_progress:
            self.emit_progress(process_id)
        
        return state
    
    def pause_process(self, process_id: str) -> Optional[ProcessState]:
        """Pause a process"""
        state = self.get_process(process_id)
        if state:
            state.paused = True
            state.paused_at = datetime.utcnow()
            state.updated_at = datetime.utcnow()
            
            self._emit_event({
                "type": "process_paused",
                "processId": process_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            self.emit_progress(process_id)
        
        return state
    
    def resume_process(self, process_id: str) -> Optional[ProcessState]:
        """Resume a paused process"""
        state = self.get_process(process_id)
        if state:
            state.paused = False
            state.paused_at = None
            state.updated_at = datetime.utcnow()
            
            self._emit_event({
                "type": "process_resumed",
                "processId": process_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            self.emit_progress(process_id)
        
        return state
    
    def stop_process(self, process_id: str) -> Optional[ProcessState]:
        """Stop a process"""
        state = self.get_process(process_id)
        if state:
            state.stopped = True
            state.paused = False  # Clear pause when stopping
            state.paused_at = None
            state.updated_at = datetime.utcnow()
            
            self._emit_event({
                "type": "process_stopped",
                "processId": process_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            self.emit_progress(process_id)
        
        return state
    
    def clear_process(self, process_id: str):
        """Clear process state and lock"""
        if process_id in self._processes:
            del self._processes[process_id]
        if process_id in self._locks:
            del self._locks[process_id]
        
        self._emit_event({
            "type": "process_cleared",
            "processId": process_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def check_control_state(
        self, 
        process_id: str,
        check_interval: float = 0.5
    ) -> Dict[str, str]:
        """
        Check process state and wait if paused.
        Returns the action to take: 'continue', 'stop', or 'not_found'
        """
        state = self.get_process(process_id)
        
        if not state:
            return {"action": "not_found"}
        
        # Check if stopped
        if state.stopped:
            return {"action": "stop"}
        
        # Wait while paused
        while state.paused:
            await asyncio.sleep(check_interval)
            state = self.get_process(process_id)
            
            if not state:
                return {"action": "not_found"}
            
            # Check for stop while paused
            if state.stopped:
                return {"action": "stop"}
        
        return {"action": "continue"}
    
    def emit_progress(
        self, 
        process_id: str, 
        current_item: str = None, 
        message: str = None
    ):
        """Emit progress update to stdout"""
        state = self.get_process(process_id)
        if not state:
            return
        
        progress_data = {
            "type": "progress",
            "processId": process_id,
            "processType": state.process_type,
            "completed": state.completed,
            "failed": state.failed,
            "total": state.total,
            "percentage": state.get_percentage(),
            "paused": state.paused,
            "stopped": state.stopped,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if current_item:
            progress_data["currentItem"] = current_item
        
        if message:
            progress_data["message"] = message
        else:
            progress_data["message"] = f"Processing {state.process_type}: {state.completed}/{state.total}"
        
        # Add any custom metadata
        if state.metadata:
            progress_data["metadata"] = state.metadata
        
        print(json.dumps(progress_data), flush=True)
    
    def get_all_processes(self) -> Dict[str, dict]:
        """Get all active process states"""
        return {pid: state.to_dict() for pid, state in self._processes.items()}
    
    def get_processes_by_type(self, process_type: str) -> Dict[str, dict]:
        """Get all processes of a specific type"""
        return {
            pid: state.to_dict() 
            for pid, state in self._processes.items() 
            if state.process_type == process_type
        }
    
    def _emit_event(self, event: Dict):
        """Emit an event to stdout for the Node.js layer to receive"""
        try:
            print(json.dumps(event), flush=True, file=sys.stderr)
        except Exception as e:
            print(f"Failed to emit event: {e}", file=sys.stderr)


# Global instance
_controller = ProcessController.get_instance()


# Convenience functions
def get_process_manager() -> ProcessController:
    """Get the global process controller instance"""
    return _controller


def create_process(process_id: str, process_type: str = "unknown", total: int = 0, **metadata) -> ProcessState:
    """Create a new process - convenience wrapper"""
    return _controller.create_process(process_id, process_type, total, **metadata)


def get_process_state(process_id: str) -> Optional[ProcessState]:
    """Get process state - convenience wrapper"""
    return _controller.get_process(process_id)


def pause_process(process_id: str) -> Optional[ProcessState]:
    """Pause a process - convenience wrapper"""
    return _controller.pause_process(process_id)


def resume_process(process_id: str) -> Optional[ProcessState]:
    """Resume a process - convenience wrapper"""
    return _controller.resume_process(process_id)


def stop_process(process_id: str) -> Optional[ProcessState]:
    """Stop a process - convenience wrapper"""
    return _controller.stop_process(process_id)


def clear_process(process_id: str):
    """Clear a process - convenience wrapper"""
    _controller.clear_process(process_id)


async def check_and_wait(process_id: str, check_interval: float = 0.5) -> str:
    """
    Check state and wait if paused - convenience wrapper
    Returns: 'continue', 'stop', or 'not_found'
    """
    result = await _controller.check_control_state(process_id, check_interval)
    return result.get("action", "continue")


async def update_progress(
    process_id: str, 
    completed: int = None, 
    failed: int = None,
    total: int = None, 
    emit: bool = True
) -> Optional[ProcessState]:
    """Update progress - convenience wrapper"""
    return await _controller.update_progress(process_id, completed, failed, total, emit)


def emit_progress(process_id: str, current_item: str = None, message: str = None):
    """Emit progress - convenience wrapper"""
    _controller.emit_progress(process_id, current_item, message)


# Legacy compatibility (for backward compatibility with old code)
def initialize_process(process_id: str, metadata: Optional[Dict] = None) -> ProcessState:
    """Legacy function - creates process without type or total"""
    return create_process(process_id, "unknown", 0, **(metadata or {}))


async def check_control_state(process_id: str, check_interval: float = 0.5) -> Dict[str, str]:
    """Legacy function - returns dict instead of string"""
    return await _controller.check_control_state(process_id, check_interval)