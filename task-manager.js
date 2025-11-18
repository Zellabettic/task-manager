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
        tags: taskData.tags ? taskData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
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
    let bucket = taskData.bucket || existingTask.bucket;
    
    // If recurring is enabled, force bucket to recurring
    if (taskData.recurring && taskData.recurring.enabled) {
        bucket = 'recurring';
    }
    
    const updatedTask = {
        ...existingTask,
        title: taskData.title,
        description: taskData.description || '',
        dueDate: taskData.dueDate || null,
        bucket: bucket,
        order: taskData.order || existingTask.order || Date.now(),
        tags: taskData.tags ? taskData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        flagged: taskData.flagged !== undefined ? taskData.flagged : (existingTask.flagged || false),
        completed: taskData.completed !== undefined ? taskData.completed : existingTask.completed || false,
        completedAt: taskData.completedAt !== undefined ? taskData.completedAt : existingTask.completedAt || null,
        updatedAt: new Date().toISOString()
    };

    if (taskData.recurring && taskData.recurring.enabled) {
        updatedTask.recurring = {
            enabled: true,
            type: taskData.recurring.type || 'daily',
            interval: parseInt(taskData.recurring.interval) || 1
        };
    } else {
        updatedTask.recurring = { enabled: false };
        // If no longer recurring and no bucket specified, determine from date
        if (!taskData.bucket && updatedTask.dueDate) {
            updatedTask.bucket = determineBucketFromDate(updatedTask.dueDate);
        }
    }

    tasks[taskIndex] = updatedTask;
    return updatedTask;
}

// Get date for a day of the week (Monday = 1, Tuesday = 2, etc.)
// Only shows current week's dates until Saturday, then shows next week
function getDateForDay(dayName) {
    try {
        const today = new Date();
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
            // It's Saturday - show next week's dates for all days
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
        const today = new Date();
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
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
    
    // If moving to a day bucket, set the due date to that day
    const dayBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (dayBuckets.includes(newBucket)) {
        const dayDate = getDateForDay(newBucket);
        if (dayDate) {
            task.dueDate = dayDate;
        }
    }
    
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
    
    task.completed = !task.completed;
    if (task.completed) {
        task.completedAt = new Date().toISOString();
        task.bucket = 'completed';
    } else {
        task.completedAt = null;
        // Restore to original bucket based on due date, or default to this-week
        if (task.dueDate) {
            task.bucket = determineBucketFromDate(task.dueDate);
        } else {
            task.bucket = 'this-week';
        }
    }
    task.updatedAt = new Date().toISOString();
    
    // If this is a recurring task being completed, create a new instance
    if (task.completed && task.recurring && task.recurring.enabled) {
        createNextRecurringTask(task);
    }
    
    return task;
}

// Calculate next due date for recurring task
function calculateNextRecurringDate(task) {
    if (!task.recurring || !task.recurring.enabled) {
        return null;
    }
    
    const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
    // Parse the date string to avoid timezone issues
    if (task.dueDate) {
        const dateParts = task.dueDate.split('-');
        if (dateParts.length === 3) {
            baseDate.setFullYear(parseInt(dateParts[0]));
            baseDate.setMonth(parseInt(dateParts[1]) - 1);
            baseDate.setDate(parseInt(dateParts[2]));
            baseDate.setHours(0, 0, 0, 0);
        }
    } else {
        baseDate.setHours(0, 0, 0, 0);
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
    
    const newTask = {
        title: completedTask.title,
        description: completedTask.description || '',
        dueDate: nextDueDate,
        bucket: 'recurring', // Recurring tasks always go to recurring bucket
        tags: [...completedTask.tags], // Copy tags
        recurring: {
            enabled: true,
            type: completedTask.recurring.type || 'daily',
            interval: completedTask.recurring.interval || 1
        }
    };
    
    return addTask(newTask);
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
        tasks = data.tasks.map((task, index) => {
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
            return task;
        });
        
        // Move tasks from past day buckets to the next weekday
        // Only call if we have tasks to avoid issues
        if (tasks.length > 0) {
            movePastDayTasksForward();
        }
    } else {
        tasks = [];
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
