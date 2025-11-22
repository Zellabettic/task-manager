// Task management operations
let tasks = [];

// Bucket definitions
const BUCKETS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'this-week', 'next-week', 'this-month', 'next-month', 'recurring', 'someday'];

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get all tasks
function getAllTasks() {
    return tasks;
}

// Get task by ID
function getTaskById(id) {
    return tasks.find(task => task.id === id);
}

// Get tasks by bucket
function getTasksByBucket(bucket) {
    return tasks.filter(task => task.bucket === bucket);
}

// Determine bucket based on due date (for migration/auto-assignment)
function determineBucketFromDate(dueDate) {
    if (!dueDate) return 'someday';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + (7 - today.getDay()));
    const nextWeekEnd = new Date(weekEnd);
    nextWeekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    if (daysDiff < 0) return 'this-week'; // Overdue goes to this week
    if (daysDiff <= 7) return 'this-week';
    if (daysDiff <= 14) return 'next-week';
    if (due <= monthEnd) return 'this-month';
    if (due <= nextMonthEnd) return 'next-month';
    return 'someday';
}

// Add new task
function addTask(taskData) {
    const task = {
        id: generateId(),
        title: taskData.title,
        description: taskData.description || '',
        dueDate: taskData.dueDate || null,
        bucket: taskData.bucket || (taskData.dueDate ? determineBucketFromDate(taskData.dueDate) : 'this-week'),
        order: taskData.order || Date.now(), // For drag and drop ordering
        tags: taskData.tags ? (Array.isArray(taskData.tags) ? taskData.tags : taskData.tags.split(',').map(t => t.trim()).filter(t => t)) : [],
        recurring: taskData.recurring || { enabled: false },
        flagged: taskData.flagged !== undefined ? taskData.flagged : false,
        completed: taskData.completed || false,
        completedAt: taskData.completedAt || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // If recurring, set bucket to recurring
    if (taskData.recurring && taskData.recurring.enabled) {
        task.bucket = 'recurring';
        task.recurring = {
            enabled: true,
            type: taskData.recurring.type || 'daily',
            interval: parseInt(taskData.recurring.interval) || 1
        };
    } else {
        // Normalize: non-recurring tasks should only have enabled: false
        task.recurring = { enabled: false };
    }

    tasks.push(task);
    return task;
}

// Update task
function updateTask(id, taskData) {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
        throw new Error('Task not found');
    }

    const existingTask = tasks[taskIndex];
    // Only update bucket if explicitly provided and not empty string
    let bucket = taskData.bucket !== undefined && taskData.bucket !== '' ? taskData.bucket : existingTask.bucket;
    
    // If recurring is enabled, force bucket to recurring
    if (taskData.recurring && taskData.recurring.enabled) {
        bucket = 'recurring';
    }
    
    const updatedTask = {
        ...existingTask,
        // Only update fields that are explicitly provided
        title: taskData.title !== undefined ? taskData.title : existingTask.title,
        description: taskData.description !== undefined ? taskData.description : existingTask.description || '',
        dueDate: taskData.dueDate !== undefined ? taskData.dueDate : existingTask.dueDate,
        bucket: bucket,
        order: taskData.order !== undefined ? taskData.order : (existingTask.order || Date.now()),
        tags: taskData.tags !== undefined ? (Array.isArray(taskData.tags) ? taskData.tags : taskData.tags.split(',').map(t => t.trim()).filter(t => t)) : existingTask.tags || [],
        flagged: taskData.flagged !== undefined ? taskData.flagged : (existingTask.flagged || false),
        completed: taskData.completed !== undefined ? taskData.completed : existingTask.completed || false,
        completedAt: taskData.completedAt !== undefined ? taskData.completedAt : existingTask.completedAt || null,
        updatedAt: new Date().toISOString()
    };

    // Only update recurring if explicitly provided
    if (taskData.recurring !== undefined) {
        if (taskData.recurring && taskData.recurring.enabled) {
            updatedTask.recurring = {
                enabled: true,
                type: taskData.recurring.type || 'daily',
                interval: parseInt(taskData.recurring.interval) || 1
            };
        } else {
            updatedTask.recurring = { enabled: false };
            // If no longer recurring and no bucket specified, determine from date
            if (taskData.bucket === undefined && updatedTask.dueDate) {
                updatedTask.bucket = determineBucketFromDate(updatedTask.dueDate);
            }
        }
    } else {
        // Preserve existing recurring settings, but normalize if not enabled
        if (existingTask.recurring && existingTask.recurring.enabled) {
            updatedTask.recurring = {
                enabled: true,
                type: existingTask.recurring.type || 'daily',
                interval: parseInt(existingTask.recurring.interval) || 1
            };
        } else {
            // Normalize: non-recurring tasks should only have enabled: false
            updatedTask.recurring = { enabled: false };
        }
    }

    tasks[taskIndex] = updatedTask;
    return updatedTask;
}

// Get date for a day of the week (Monday = 1, Tuesday = 2, etc.)
// Uses 7pm as the cutoff - after 7pm, treats it as the next day
function getDateForDay(dayName) {
    try {
        // Use 7pm as the cutoff - if it's after 7pm, treat as next day
        const now = new Date();
        const cutoffTime = new Date(now);
        cutoffTime.setHours(19, 0, 0, 0); // 7pm
        
        // If current time is after 7pm, use tomorrow as the reference date
        const referenceDate = now >= cutoffTime ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now;
        const today = new Date(referenceDate);
        today.setHours(0, 0, 0, 0);
        
        const dayMap = {
            'monday': 1,
            'tuesday': 2,
            'wednesday': 3,
            'thursday': 4,
            'friday': 5
        };
        
        const targetDay = dayMap[dayName.toLowerCase()];
        if (!targetDay) return null;
        
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        let daysUntilTarget;
        
        if (currentDay === 6) {
            // It's Saturday (or Friday after 7pm) - show next week's dates for all days
            // Next Monday is 2 days away, next Tuesday is 3, etc.
            daysUntilTarget = targetDay + 1;
        } else if (currentDay === 0) {
            // It's Sunday - show next week's dates for all days
            // Next Monday is 1 day away, next Tuesday is 2, etc.
            daysUntilTarget = targetDay;
        } else {
            // It's Monday-Friday - show this week's dates only for remaining days
            // Calculate days until target day in this week
            if (currentDay <= targetDay) {
                // Target day is today or in the future this week
                daysUntilTarget = targetDay - currentDay;
            } else {
                // Target day has already passed this week - this shouldn't happen since we hide those buckets
                // But if it does, calculate the date anyway
                const daysSinceMonday = currentDay - 1;
                const thisWeekMonday = new Date(today);
                thisWeekMonday.setDate(today.getDate() - daysSinceMonday);
                thisWeekMonday.setHours(0, 0, 0, 0);
                const targetDateThisWeek = new Date(thisWeekMonday);
                targetDateThisWeek.setDate(thisWeekMonday.getDate() + (targetDay - 1));
                targetDateThisWeek.setHours(0, 0, 0, 0);
                daysUntilTarget = Math.floor((targetDateThisWeek.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }
        }
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntilTarget);
        targetDate.setHours(0, 0, 0, 0);
        
        // Format as YYYY-MM-DD
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error in getDateForDay:', error, dayName);
        // Fallback to original simple logic if there's an error
        const now = new Date();
        const cutoffTime = new Date(now);
        cutoffTime.setHours(19, 0, 0, 0);
        const referenceDate = now >= cutoffTime ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now;
        const today = new Date(referenceDate);
        today.setHours(0, 0, 0, 0);
        const dayMap = {
            'monday': 1,
            'tuesday': 2,
            'wednesday': 3,
            'thursday': 4,
            'friday': 5
        };
        const targetDay = dayMap[dayName.toLowerCase()];
        if (!targetDay) return null;
        const currentDay = today.getDay();
        let daysUntilTarget = (targetDay - currentDay + 7) % 7;
        if (daysUntilTarget === 0 && currentDay !== targetDay) {
            daysUntilTarget = 7;
        }
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntilTarget);
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// Get the next weekday bucket (Monday->Tuesday, Friday->Monday)
function getNextWeekdayBucket(currentBucket) {
    const dayBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const currentIndex = dayBuckets.indexOf(currentBucket.toLowerCase());
    if (currentIndex === -1) return null;
    
    // If Friday, wrap to Monday
    if (currentIndex === 4) {
        return 'monday';
    }
    
    return dayBuckets[currentIndex + 1];
}

// Move tasks from past day buckets to the next weekday
function movePastDayTasksForward() {
    try {
        const dayBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        // Use 7pm as the cutoff - if it's after 7pm, treat as next day
        const now = new Date();
        const cutoffTime = new Date(now);
        cutoffTime.setHours(19, 0, 0, 0); // 7pm
        
        // If current time is after 7pm, use tomorrow as the reference date
        const referenceDate = now >= cutoffTime ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now;
        const today = new Date(referenceDate);
        today.setHours(0, 0, 0, 0);
        
        // Determine if we're showing next week's buckets
        // This happens on Friday after 7pm, Saturday, or Sunday
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const isAfter7PM = now >= cutoffTime;
        const isShowingNextWeek = (isAfter7PM && currentDay === 5) || currentDay === 6 || currentDay === 0;
        
        // Safety check - make sure tasks array exists
        if (!tasks || !Array.isArray(tasks)) {
            console.warn('Tasks array not available for movePastDayTasksForward');
            return;
        }
        
        // Find all tasks in day buckets where the bucket's date is in the past
        // We move based on the bucket date, not the task's due date
        const tasksToMove = tasks.filter(task => {
            try {
                // Only process tasks in day buckets that are not completed or flagged
                if (!task || !task.bucket || !dayBuckets.includes(task.bucket) || task.completed || task.flagged) {
                    return false;
                }
                
                // Don't move tasks that were just updated (within last 2 seconds)
                // This prevents moving tasks that were just dropped into a bucket
                if (task.updatedAt) {
                    const updatedTime = new Date(task.updatedAt).getTime();
                    const nowTime = now.getTime();
                    const timeSinceUpdate = nowTime - updatedTime;
                    // If updated within last 2 seconds, don't move it
                    if (timeSinceUpdate < 2000) {
                        return false;
                    }
                }
                
                // Special case: If we're showing next week's buckets (Friday after 7pm, Saturday, or Sunday)
                // and tasks are in the Friday bucket, check if they should be moved to Monday
                // Only move if the Friday date is actually from last week (before Monday's date)
                if (isShowingNextWeek && task.bucket === 'friday') {
                    // Get the dates for Friday and Monday to compare
                    if (typeof getDateForDay === 'function') {
                        const fridayDateStr = getDateForDay('friday');
                        const mondayDateStr = getDateForDay('monday');
                        
                        if (fridayDateStr && mondayDateStr) {
                            // Parse dates
                            const fridayParts = fridayDateStr.split('-');
                            const mondayParts = mondayDateStr.split('-');
                            
                            if (fridayParts.length === 3 && mondayParts.length === 3) {
                                const fridayDate = new Date(
                                    parseInt(fridayParts[0]),
                                    parseInt(fridayParts[1]) - 1,
                                    parseInt(fridayParts[2])
                                );
                                const mondayDate = new Date(
                                    parseInt(mondayParts[0]),
                                    parseInt(mondayParts[1]) - 1,
                                    parseInt(mondayParts[2])
                                );
                                
                                fridayDate.setHours(0, 0, 0, 0);
                                mondayDate.setHours(0, 0, 0, 0);
                                
                                // Only move if Friday's date is BEFORE Monday's date (meaning it's from last week)
                                // Never move if Friday's date is after Monday's (which would be wrong)
                                if (fridayDate < mondayDate) {
                                    return true;
                                }
                                // If Friday date >= Monday date, don't move (it's already in the correct week)
                                return false;
                            }
                        }
                    }
                    // If we can't get dates, fall back to the old behavior but be more conservative
                    // Only move if we're on Saturday or Sunday (not Friday after 7pm, as that's the transition)
                    if (currentDay === 6 || currentDay === 0) {
                        return true;
                    }
                    return false;
                }
                
                // Get the date this bucket currently represents
                if (typeof getDateForDay !== 'function') {
                    return false;
                }
                
                const bucketDateStr = getDateForDay(task.bucket);
                if (!bucketDateStr) return false;
                
                // Parse the bucket date
                const bucketDateParts = bucketDateStr.split('-');
                if (bucketDateParts.length !== 3) return false;
                
                const bucketDate = new Date(
                    parseInt(bucketDateParts[0]),
                    parseInt(bucketDateParts[1]) - 1,
                    parseInt(bucketDateParts[2])
                );
                bucketDate.setHours(0, 0, 0, 0);
                
                // If the bucket's date is in the past, move the task to the next weekday
                // This moves Monday→Tuesday, Tuesday→Wednesday, etc., regardless of the task's due date
                if (bucketDate < today) {
                    return true;
                }
                
                return false;
            } catch (error) {
                console.error('Error filtering task in movePastDayTasksForward:', error, task);
                return false;
            }
        });
        
        // Move each task to the next weekday
        // Don't change the task's due date - just move it to the next weekday bucket
        tasksToMove.forEach(task => {
            try {
                const nextBucket = getNextWeekdayBucket(task.bucket);
                if (nextBucket) {
                    // For Friday->Monday moves, double-check the dates to prevent wrong moves
                    if (task.bucket === 'friday' && nextBucket === 'monday') {
                        if (typeof getDateForDay === 'function') {
                            const fridayDateStr = getDateForDay('friday');
                            const mondayDateStr = getDateForDay('monday');
                            
                            if (fridayDateStr && mondayDateStr) {
                                const fridayParts = fridayDateStr.split('-');
                                const mondayParts = mondayDateStr.split('-');
                                
                                if (fridayParts.length === 3 && mondayParts.length === 3) {
                                    const fridayDate = new Date(
                                        parseInt(fridayParts[0]),
                                        parseInt(fridayParts[1]) - 1,
                                        parseInt(fridayParts[2])
                                    );
                                    const mondayDate = new Date(
                                        parseInt(mondayParts[0]),
                                        parseInt(mondayParts[1]) - 1,
                                        parseInt(mondayParts[2])
                                    );
                                    
                                    fridayDate.setHours(0, 0, 0, 0);
                                    mondayDate.setHours(0, 0, 0, 0);
                                    
                                    // Never move if Friday date >= Monday date (would be wrong)
                                    if (fridayDate >= mondayDate) {
                                        console.log('Skipping move: Friday date is not before Monday date', {
                                            friday: fridayDateStr,
                                            monday: mondayDateStr
                                        });
                                        return; // Skip this move
                                    }
                                }
                            }
                        }
                    }
                    
                    task.bucket = nextBucket;
                    // Keep the original due date - don't change it
                    task.updatedAt = new Date().toISOString();
                }
            } catch (error) {
                console.error('Error moving task in movePastDayTasksForward:', error, task);
            }
        });
    } catch (error) {
        console.error('Error in movePastDayTasksForward:', error);
        // Don't throw - just log the error so the app continues to work
    }
}

// Move task to bucket
function moveTaskToBucket(taskId, newBucket) {
    const task = getTaskById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }
    
    task.bucket = newBucket;
    
    // Do NOT change the due date when moving between buckets
    // The due date should remain unchanged - only the bucket changes
    
    task.updatedAt = new Date().toISOString();
    return task;
}

// Toggle flag status
function toggleTaskFlag(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }
    
    const wasFlagged = task.flagged;
    task.flagged = !task.flagged;
    task.updatedAt = new Date().toISOString();
    
    // When flagging a task, set order to put it at the end of flagged tasks
    if (task.flagged && !wasFlagged) {
        // Get all currently flagged tasks to find max order
        const flaggedTasks = tasks.filter(t => t.flagged === true && t.id !== taskId);
        if (flaggedTasks.length > 0) {
            // Find the maximum order value
            const maxOrder = Math.max(...flaggedTasks.map(t => 
                t.order || (t.createdAt ? new Date(t.createdAt).getTime() : 0)
            ));
            // Set order to be after the last flagged task
            task.order = maxOrder + 10000;
        } else {
            // First flagged task - use current timestamp
            task.order = Date.now();
        }
    }
    
    // When unflagging a task, set order to put it at the end of its bucket
    if (!task.flagged && wasFlagged) {
        // Get all tasks in the same bucket (excluding the current task, flagged tasks, and completed tasks)
        const bucketTasks = tasks.filter(t => 
            t.bucket === task.bucket && 
            t.id !== taskId && 
            !t.flagged && 
            !t.completed
        );
        
        if (bucketTasks.length > 0) {
            // Find the maximum order value in the bucket
            const maxOrder = Math.max(...bucketTasks.map(t => 
                t.order || (t.createdAt ? new Date(t.createdAt).getTime() : 0)
            ));
            // Set order to be after the last task in the bucket
            task.order = maxOrder + 10000;
        } else {
            // Empty bucket - use current timestamp
            task.order = Date.now();
        }
    }
    
    return task;
}

// Get flagged tasks
function getFlaggedTasks() {
    return tasks.filter(task => task.flagged === true);
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
    const task = getTaskById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }
    
    // Check if this is a recurring task BEFORE marking as completed
    // This ensures we have the correct recurring state before the task is modified
    const isRecurring = task.recurring && task.recurring.enabled;
    const wasCompleted = task.completed;
    
    // Save original task data BEFORE modifying it (needed for creating new recurring instance)
    const originalTaskData = {
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate,
        tags: task.tags && Array.isArray(task.tags) ? [...task.tags] : [],
        recurring: task.recurring ? { ...task.recurring } : { enabled: false }
    };
    
    task.completed = !task.completed;
    if (task.completed) {
        task.completedAt = new Date().toISOString();
        
        // If this is a recurring task being completed, create a new instance
        if (isRecurring && !wasCompleted) {
            try {
                console.log('Creating next instance of recurring task:', task.title);
                // Use original task data to create the new instance
                const newTask = createNextRecurringTask(originalTaskData);
                if (newTask) {
                    console.log('New recurring task created:', newTask.id, 'due:', newTask.dueDate, 'bucket:', newTask.bucket);
                } else {
                    console.error('Failed to create next recurring task - createNextRecurringTask returned null');
                }
            } catch (error) {
                // Don't let recurring task creation errors break the completion toggle
                console.error('Error creating next recurring task:', error);
                // Task is still marked as completed, just the new instance creation failed
            }
        }
        
        // For recurring tasks, keep them in the recurring bucket even when completed
        // For non-recurring tasks, move to completed bucket
        if (!isRecurring) {
            task.bucket = 'completed';
        }
        // If recurring, keep it in recurring bucket (don't move to completed)
    } else {
        task.completedAt = null;
        // Restore to original bucket based on due date, or default to this-week
        // But if it's recurring, keep it in recurring bucket
        if (isRecurring) {
            task.bucket = 'recurring';
        } else if (task.dueDate) {
            task.bucket = determineBucketFromDate(task.dueDate);
        } else {
            task.bucket = 'this-week';
        }
    }
    task.updatedAt = new Date().toISOString();
    
    return task;
}

// Calculate next due date for recurring task
function calculateNextRecurringDate(task) {
    if (!task.recurring || !task.recurring.enabled) {
        return null;
    }
    
    // Use today's date as the base for calculating the next occurrence
    // This ensures that if a task is completed late, the next occurrence
    // is calculated from today, not from the past due date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If the task has a due date, use the later of today or the due date
    let baseDate = today;
    if (task.dueDate) {
        const dateParts = task.dueDate.split('-');
        if (dateParts.length === 3) {
            const dueDate = new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
            );
            dueDate.setHours(0, 0, 0, 0);
            // Use the later date (today or due date) to avoid going backwards
            if (dueDate > today) {
                baseDate = dueDate;
            }
        }
    }
    
    const nextDate = new Date(baseDate);
    const interval = parseInt(task.recurring.interval) || 1;
    const type = task.recurring.type || 'daily';
    
    switch (type) {
        case 'daily':
            nextDate.setDate(baseDate.getDate() + interval);
            break;
        case 'weekly':
            nextDate.setDate(baseDate.getDate() + (7 * interval));
            break;
        case 'monthly':
            nextDate.setMonth(baseDate.getMonth() + interval);
            // Handle month-end edge cases (e.g., Jan 31 -> Feb 28/29)
            if (nextDate.getDate() !== baseDate.getDate()) {
                nextDate.setDate(0); // Go to last day of previous month
            }
            break;
        case 'yearly':
            nextDate.setFullYear(baseDate.getFullYear() + interval);
            // Handle leap year edge cases (e.g., Feb 29 -> Feb 28 in non-leap years)
            if (nextDate.getMonth() !== baseDate.getMonth()) {
                nextDate.setDate(0); // Go to last day of previous month
            }
            break;
        default:
            nextDate.setDate(baseDate.getDate() + interval);
    }
    
    // Format as YYYY-MM-DD
    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Create next instance of a recurring task
function createNextRecurringTask(completedTask) {
    if (!completedTask.recurring || !completedTask.recurring.enabled) {
        return null;
    }
    
    const nextDueDate = calculateNextRecurringDate(completedTask);
    if (!nextDueDate) {
        console.error('Failed to calculate next due date for recurring task');
        return null;
    }
    
    const newTask = {
        title: completedTask.title,
        description: completedTask.description || '',
        dueDate: nextDueDate,
        bucket: 'recurring', // Recurring tasks always go to recurring bucket
        tags: completedTask.tags && Array.isArray(completedTask.tags) ? [...completedTask.tags] : [],
        recurring: {
            enabled: true,
            type: completedTask.recurring.type || 'daily',
            interval: completedTask.recurring.interval || 1
        }
    };
    
    console.log('Creating new recurring task:', newTask.title, 'due:', newTask.dueDate);
    const createdTask = addTask(newTask);
    console.log('New recurring task created with ID:', createdTask.id);
    
    return createdTask;
}

// Get completed tasks
function getCompletedTasks() {
    return tasks.filter(task => task.completed === true);
}

// Reorder flagged tasks (similar to reorderTaskInBucket but for flagged tasks)
function reorderFlaggedTask(taskId, insertBeforeTaskId) {
    const task = getTaskById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }
    
    if (!task.flagged) {
        throw new Error('Task is not flagged');
    }
    
    // Get all flagged tasks (excluding the one being moved)
    let flaggedTasks = tasks.filter(t => t.flagged === true && t.id !== taskId);
    
    // Sort by current order
    flaggedTasks.sort((a, b) => {
        const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return orderA - orderB;
    });
    
    // Build new ordered array
    let newOrderedTasks = [];
    
    if (insertBeforeTaskId) {
        // Find the target task and insert before it
        const targetIndex = flaggedTasks.findIndex(t => t.id === insertBeforeTaskId);
        if (targetIndex >= 0) {
            // Insert before target
            newOrderedTasks = [
                ...flaggedTasks.slice(0, targetIndex),
                task,
                ...flaggedTasks.slice(targetIndex)
            ];
        } else {
            // Target not found, add to end
            newOrderedTasks = [...flaggedTasks, task];
        }
    } else {
        // Add to end
        newOrderedTasks = [...flaggedTasks, task];
    }
    
    // Reassign orders sequentially (with spacing for future inserts)
    newOrderedTasks.forEach((t, index) => {
        t.order = (index + 1) * 10000;
        if (t.id === taskId) {
            t.updatedAt = new Date().toISOString();
        }
    });
    
    // Update the global tasks array (no need to filter/replace since we're just reordering)
    return task;
}

// Reorder tasks within a bucket
function reorderTaskInBucket(taskId, insertBeforeTaskId, bucket) {
    const task = getTaskById(taskId);
    if (!task) {
        throw new Error('Task not found');
    }
    
    // Get all tasks in the bucket (excluding the one being moved)
    let bucketTasks = tasks.filter(t => t.bucket === bucket && t.id !== taskId);
    
    // Sort by current order
    bucketTasks.sort((a, b) => {
        const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return orderA - orderB;
    });
    
    // Build new ordered array
    let newOrderedTasks = [];
    
    if (insertBeforeTaskId) {
        // Find the target task and insert before it
        const targetIndex = bucketTasks.findIndex(t => t.id === insertBeforeTaskId);
        if (targetIndex >= 0) {
            // Insert before target
            newOrderedTasks = [
                ...bucketTasks.slice(0, targetIndex),
                task,
                ...bucketTasks.slice(targetIndex)
            ];
        } else {
            // Target not found, add to end
            newOrderedTasks = [...bucketTasks, task];
        }
    } else {
        // Add to end
        newOrderedTasks = [...bucketTasks, task];
    }
    
    // Reassign orders sequentially (with spacing for future inserts)
    newOrderedTasks.forEach((t, index) => {
        t.order = (index + 1) * 10000;
        if (t.id === taskId) {
            t.updatedAt = new Date().toISOString();
        }
    });
    
    return task;
}

// Delete task
function deleteTask(id) {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
        throw new Error('Task not found');
    }
    tasks.splice(taskIndex, 1);
}

// Note: Status functionality removed per user request

// Load tasks from data structure (with migration from project to bucket)
function loadTasks(data) {
    if (data && data.tasks) {
        // Filter out invalid tasks (missing ID or title) but log them for debugging
        const invalidTasks = [];
        const validTasks = data.tasks.filter((task, index) => {
            if (!task || !task.id) {
                invalidTasks.push({ index, reason: 'Missing ID', task });
                return false;
            }
            if (!task.title || task.title.trim() === '') {
                invalidTasks.push({ index, reason: 'Missing or empty title', task });
                return false;
            }
            return true;
        });
        
        if (invalidTasks.length > 0) {
            console.warn(`Skipping ${invalidTasks.length} invalid task(s) during load:`, invalidTasks);
        }
        
        tasks = validTasks.map((task, index) => {
            // Ensure title exists and is not empty
            if (!task.title || task.title.trim() === '') {
                console.error('Task missing title after validation:', task);
                // Use a placeholder to prevent data loss
                task.title = task.title || `Untitled Task ${task.id}`;
            }
            
            // Migrate old tasks: if they have project but no bucket, determine bucket from date
            if (!task.bucket) {
                if (task.project) {
                    // Try to map old project names to buckets, or use date
                    task.bucket = task.dueDate ? determineBucketFromDate(task.dueDate) : 'someday';
                } else {
                    task.bucket = task.dueDate ? determineBucketFromDate(task.dueDate) : 'this-week';
                }
            }
            // Ensure bucket is valid (including day buckets)
            const allValidBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', ...BUCKETS];
            if (!allValidBuckets.includes(task.bucket)) {
                task.bucket = 'this-week';
            }
            // If recurring is enabled, ensure bucket is recurring
            if (task.recurring && task.recurring.enabled) {
                task.bucket = 'recurring';
            }
            // Ensure order exists - use existing order or create from createdAt
            if (!task.order) {
                task.order = task.createdAt ? new Date(task.createdAt).getTime() : Date.now() + (index * 1000);
            }
            // Ensure flagged field exists
            if (task.flagged === undefined) {
                task.flagged = false;
            }
            // Ensure completed field exists
            if (task.completed === undefined) {
                task.completed = false;
            }
            // If task is completed, ensure it's in completed bucket
            if (task.completed && task.bucket !== 'completed') {
                task.bucket = 'completed';
            }
            
            // Normalize recurring field: if not enabled, only keep enabled: false
            if (task.recurring) {
                if (task.recurring.enabled) {
                    // Ensure type and interval are present for enabled recurring tasks
                    task.recurring = {
                        enabled: true,
                        type: task.recurring.type || 'daily',
                        interval: parseInt(task.recurring.interval) || 1
                    };
                } else {
                    // Normalize: non-recurring tasks should only have enabled: false
                    task.recurring = { enabled: false };
                }
            } else {
                task.recurring = { enabled: false };
            }
            
            return task;
        });
        
        console.log(`Loaded ${tasks.length} valid task(s) from ${data.tasks.length} total task(s)`);
        
        // Move tasks from past day buckets to the next weekday
        // Only call if we have tasks to avoid issues
        if (tasks.length > 0) {
            movePastDayTasksForward();
        }
    } else {
        tasks = [];
        console.log('No task data found or data.tasks is missing');
    }
}

// Get tasks data structure
function getTasksData() {
    return {
        version: '1.0',
        lastSync: new Date().toISOString(),
        tasks: tasks
    };
}

// Filter tasks by search term
function filterTasksBySearch(searchTerm) {
    if (!searchTerm) return tasks;
    
    const term = searchTerm.toLowerCase();
    return tasks.filter(task => {
        // Search in title
        if (task.title.toLowerCase().includes(term)) return true;
        
        // Search in description
        if (task.description && task.description.toLowerCase().includes(term)) return true;
        
        // Search in tags
        if (task.tags && task.tags.some(tag => tag.toLowerCase().includes(term))) return true;
        
        // Search in due date
        if (task.dueDate) {
            // Format date for searching (e.g., "01/15/24", "jan 15", "monday", etc.)
            try {
                const dateParts = task.dueDate.split('-');
                if (dateParts.length === 3) {
                    const year = parseInt(dateParts[0]);
                    const month = parseInt(dateParts[1]) - 1;
                    const day = parseInt(dateParts[2]);
                    const date = new Date(year, month, day);
                    
                    // Check formatted date (e.g., "Mon, Jan 15")
                    // Format as "Mon, Jan 15" for searching
                    const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const formattedDate = `${dayNamesShort[date.getDay()]}, ${monthNamesShort[month]} ${day}`.toLowerCase();
                    if (formattedDate.includes(term)) return true;
                    
                    // Check date parts
                    const monthNamesFull = ['january', 'february', 'march', 'april', 'may', 'june', 
                                      'july', 'august', 'september', 'october', 'november', 'december'];
                    const monthName = monthNamesFull[month].toLowerCase();
                    const monthAbbr = monthName.substring(0, 3);
                    const dayNamesFull = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const dayName = dayNamesFull[date.getDay()].toLowerCase();
                    const dayAbbr = dayName.substring(0, 3);
                    
                    // Check various date formats
                    if (monthName.includes(term) || monthAbbr.includes(term)) return true;
                    if (dayName.includes(term) || dayAbbr.includes(term)) return true;
                    if (String(day).includes(term)) return true;
                    if (String(month + 1).includes(term)) return true;
                    if (String(year).includes(term) || String(year).slice(-2).includes(term)) return true;
                    
                    // Check mm/dd/yy format
                    const mmdd = `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${String(year).slice(-2)}`;
                    if (mmdd.includes(term)) return true;
                }
            } catch (e) {
                // If date parsing fails, continue without matching on date
            }
        }
        
        return false;
    });
}

// Get bucket counts
function getBucketCounts() {
    const counts = {};
    BUCKETS.forEach(bucket => {
        counts[bucket] = tasks.filter(t => t.bucket === bucket).length;
    });
    return counts;
}

// Local storage operations
function saveLocalTasks(data) {
    try {
        localStorage.setItem('tasks', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function getLocalTasks() {
    try {
        const stored = localStorage.getItem('tasks');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}
