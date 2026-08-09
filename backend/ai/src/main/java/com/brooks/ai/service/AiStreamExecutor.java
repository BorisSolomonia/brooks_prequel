package com.brooks.ai.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;

@Component
public class AiStreamExecutor {

    private final TaskExecutor taskExecutor;

    public AiStreamExecutor(@Qualifier("aiTaskExecutor") TaskExecutor taskExecutor) {
        this.taskExecutor = taskExecutor;
    }

    public void execute(Runnable task) {
        taskExecutor.execute(task);
    }
}